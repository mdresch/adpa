/**
 * Document Upload Service
 * 
 * Handles bulk document uploads for client onboarding assessment.
 * Manages upload batches, file processing, and progress tracking.
 * 
 * @module documentUploadService
 */

import { Pool } from 'pg';
import Queue, { Job } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { logger } from '../utils/logger';
import { pool } from '../database/connection'; // Use shared pool with correct SSL config
import { documentConversionService, ConversionOptions } from './documentConversionService';
import { qualityAuditService } from './qualityAuditService';
import { io } from '../server'; // WebSocket for real-time updates

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface UploadBatchOptions {
  projectId: string;
  uploadedBy: string;
  files: Express.Multer.File[];
  industryVertical?: string;
  metadata?: Record<string, any>;
}

export interface UploadBatchResult {
  batchId: string;
  totalFiles: number;
  status: 'processing' | 'completed' | 'failed';
  createdAt: Date;
}

export interface FileProcessingJob {
  batchId: string;
  fileId: string;
  projectId: string;
  uploadedBy: string;
  filename: string;
  originalFormat: string;
  buffer: Buffer;
  fileSize: number;
  fileHash: string;
  metadata?: Record<string, any>;
}

export interface FileProcessingResult {
  success: boolean;
  documentId?: string;
  filename: string;
  detectedType?: string;
  qualityScore?: number;
  error?: string;
}

export interface BatchStatusResponse {
  batchId: string;
  projectId: string;
  totalFiles: number;
  processedFiles: number;
  successfulFiles: number;
  failedFiles: number;
  status: 'processing' | 'completed' | 'failed' | 'cancelled';
  files: Array<{
    filename: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    documentId?: string;
    detectedType?: string;
    qualityScore?: number;
    error?: string;
    progress?: number;
  }>;
  createdAt: Date;
  completedAt?: Date;
}

// ============================================================================
// SETUP
// ============================================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Create Bull queue for document processing
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
export const documentUploadQueue = new Queue<FileProcessingJob>('document-upload', REDIS_URL, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: false, // Keep for tracking
    removeOnFail: false
  }
});

// ============================================================================
// UPLOAD BATCH MANAGEMENT
// ============================================================================

/**
 * Create a new upload batch and enqueue files for processing
 */
export async function createUploadBatch(
  options: UploadBatchOptions
): Promise<UploadBatchResult> {
  const batchId = uuidv4();
  const { projectId, uploadedBy, files, metadata } = options;

  logger.info('Creating upload batch', {
    batchId,
    projectId,
    uploadedBy,
    fileCount: files.length
  });

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create upload batch record
    const batchQuery = `
      INSERT INTO upload_batches (
        id, project_id, uploaded_by, total_files, status, batch_metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, created_at
    `;

    const batchResult = await client.query(batchQuery, [
      batchId,
      projectId,
      uploadedBy,
      files.length,
      'processing',
      JSON.stringify(metadata || {})
    ]);

    // Create temporary tracking table for batch files
    await createBatchFileTracking(client, batchId, files);

    await client.query('COMMIT');

    // Enqueue files for processing (parallel)
    const jobs = await Promise.all(
      files.map((file, index) => 
        enqueueFileProcessing(batchId, projectId, uploadedBy, file, index)
      )
    );

    logger.info('Upload batch created and files enqueued', {
      batchId,
      jobCount: jobs.length
    });

    // Emit WebSocket event
    emitBatchProgress(batchId, projectId, {
      totalFiles: files.length,
      processedFiles: 0,
      status: 'processing'
    });

    return {
      batchId,
      totalFiles: files.length,
      status: 'processing',
      createdAt: batchResult.rows[0].created_at
    };

  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Failed to create upload batch', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Create temporary tracking for batch files
 */
async function createBatchFileTracking(
  client: any,
  batchId: string,
  files: Express.Multer.File[]
): Promise<void> {
  // Create temporary table if not exists (session-scoped)
  await client.query(`
    CREATE TEMP TABLE IF NOT EXISTS batch_file_tracking (
      batch_id UUID,
      file_id UUID,
      filename VARCHAR(500),
      status VARCHAR(20) DEFAULT 'pending',
      document_id UUID,
      error TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    ) ON COMMIT PRESERVE ROWS
  `);

  // Insert file records
  for (const file of files) {
    const fileId = uuidv4();
    await client.query(`
      INSERT INTO batch_file_tracking (batch_id, file_id, filename)
      VALUES ($1, $2, $3)
    `, [batchId, fileId, file.originalname]);
  }
}

/**
 * Enqueue single file for processing
 */
async function enqueueFileProcessing(
  batchId: string,
  projectId: string,
  uploadedBy: string,
  file: Express.Multer.File,
  index: number
): Promise<Job<FileProcessingJob>> {
  const fileId = uuidv4();
  
  // Calculate file hash for deduplication
  const fileHash = crypto
    .createHash('sha256')
    .update(file.buffer)
    .digest('hex');

  // Detect file format from mimetype and extension
  const format = detectFileFormat(file);

  const jobData: FileProcessingJob = {
    batchId,
    fileId,
    projectId,
    uploadedBy,
    filename: file.originalname,
    originalFormat: format,
    buffer: file.buffer,
    fileSize: file.size,
    fileHash,
    metadata: {
      mimetype: file.mimetype,
      encoding: file.encoding,
      originalname: file.originalname,
      uploadIndex: index
    }
  };

  return await documentUploadQueue.add(jobData, {
    jobId: fileId,
    priority: index + 1 // Process in upload order
  });
}

/**
 * Detect file format from file object
 */
function detectFileFormat(file: Express.Multer.File): string {
  const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
  
  if (ext === 'pdf' || file.mimetype === 'application/pdf') return 'pdf';
  if (ext === 'docx' || file.mimetype.includes('wordprocessingml')) return 'docx';
  if (ext === 'txt' || file.mimetype === 'text/plain') return 'txt';
  if (ext === 'md' || ext === 'markdown') return 'md';
  if (ext === 'html' || ext === 'htm') return 'html';
  if (ext === 'rtf') return 'rtf';
  
  throw new Error(`Unsupported file format: ${ext}`);
}

// ============================================================================
// FILE PROCESSING WORKER
// ============================================================================

/**
 * Process a single uploaded file
 * Workflow: Convert → Detect Type → Create Document → Run Quality Audit
 */
export async function processUploadedFile(
  job: Job<FileProcessingJob>
): Promise<FileProcessingResult> {
  const { batchId, fileId, projectId, uploadedBy, filename, originalFormat, buffer, fileHash } = job.data;

  logger.info('Processing uploaded file', {
    batchId,
    fileId,
    filename,
    format: originalFormat,
    size: buffer.length
  });

  const client = await pool.connect();

  try {
    // Update job progress: 10%
    await job.progress(10);
    emitFileProgress(batchId, projectId, filename, 10, 'Converting to Markdown');

    // Step 1: Convert to Markdown
    const conversionOptions: ConversionOptions = {
      format: originalFormat as any,
      filename,
      preserveFormatting: true,
      extractImages: false
    };

    const conversionResult = await documentConversionService.convertToMarkdown(
      buffer,
      conversionOptions
    );

    logger.info('File converted to Markdown', {
      filename,
      wordCount: conversionResult.metadata.wordCount,
      quality: conversionResult.metadata.quality
    });

    await job.progress(30);
    emitFileProgress(batchId, projectId, filename, 30, 'Detecting document type');

    // Step 2: Detect document type using AI
    const detectionResult = await detectDocumentType(
      conversionResult.markdown,
      filename
    );

    logger.info('Document type detected', {
      filename,
      type: detectionResult.type,
      confidence: detectionResult.confidence
    });

    await job.progress(50);
    emitFileProgress(batchId, projectId, filename, 50, 'Creating document record');

    // Step 3: Create document in database
    const documentId = await createDocumentRecord(client, {
      projectId,
      uploadedBy,
      batchId,
      filename,
      originalFormat,
      markdown: conversionResult.markdown,
      detectedType: detectionResult.type,
      detectionConfidence: detectionResult.confidence,
      conversionMetadata: conversionResult.metadata,
      detectionMetadata: detectionResult.metadata,
      fileHash,
      fileSize: buffer.length
    });

    logger.info('Document record created', {
      documentId,
      filename
    });

    await job.progress(70);
    emitFileProgress(batchId, projectId, filename, 70, 'Running quality audit');

    // Step 4: Run quality audit
    const auditResult = await qualityAuditService.auditDocument(
      documentId,
      conversionResult.markdown,
      detectionResult.type,
      { project_id: projectId }, // Project context
      uploadedBy
    );

    logger.info('Quality audit completed', {
      documentId,
      filename,
      score: auditResult.overallScore,
      grade: auditResult.overallGrade
    });

    await job.progress(100);
    emitFileProgress(batchId, projectId, filename, 100, 'Completed');

    // Update batch progress
    await updateBatchProgress(batchId, 'success');

    await client.query('COMMIT');

    return {
      success: true,
      documentId,
      filename,
      detectedType: detectionResult.type,
      qualityScore: auditResult.overallScore
    };

  } catch (error: any) {
    await client.query('ROLLBACK');
    
    logger.error('File processing failed', {
      batchId,
      filename,
      error: error.message,
      stack: error.stack
    });

    // Update batch progress
    await updateBatchProgress(batchId, 'failed', error.message);

    emitFileProgress(batchId, projectId, filename, 100, 'Failed', error.message);

    return {
      success: false,
      filename,
      error: error.message
    };

  } finally {
    client.release();
  }
}

// ============================================================================
// DOCUMENT TYPE DETECTION
// ============================================================================

/**
 * Detect document type using AI
 */
async function detectDocumentType(
  markdown: string,
  filename: string
): Promise<{
  type: string;
  confidence: number;
  metadata: Record<string, any>;
}> {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  
  if (!process.env.GOOGLE_AI_API_KEY) {
    // Fallback: simple keyword-based detection
    return detectDocumentTypeKeywords(markdown, filename);
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Analyze this document and classify its type.

Document filename: ${filename}

Document content (first 2000 characters):
${markdown.substring(0, 2000)}

Common project management document types:
- Project Charter
- Business Case
- Scope Statement
- Work Breakdown Structure (WBS)
- Project Schedule / Gantt Chart
- Risk Register / Risk Management Plan
- Quality Management Plan
- Communication Plan
- Stakeholder Register
- Change Management Plan
- Requirements Document
- Test Plan
- Status Report
- Lessons Learned
- Project Closure Report

Respond in JSON format:
{
  "type": "exact document type from list above",
  "confidence": 0.95,
  "reasoning": "brief explanation",
  "alternative_types": ["type2", "type3"]
}`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      type: parsed.type,
      confidence: parsed.confidence,
      metadata: {
        aiProvider: 'google-gemini',
        model: 'gemini-1.5-flash',
        reasoning: parsed.reasoning,
        alternativeTypes: parsed.alternative_types
      }
    };

  } catch (error: any) {
    logger.warn('AI document type detection failed, using keyword fallback', {
      error: error.message
    });
    
    return detectDocumentTypeKeywords(markdown, filename);
  }
}

/**
 * Fallback: keyword-based document type detection
 */
function detectDocumentTypeKeywords(
  markdown: string,
  filename: string
): {
  type: string;
  confidence: number;
  metadata: Record<string, any>;
} {
  const lowerContent = markdown.toLowerCase();
  const lowerFilename = filename.toLowerCase();

  const patterns: Array<{ type: string; keywords: string[]; filenameKeywords: string[] }> = [
    {
      type: 'Project Charter',
      keywords: ['project charter', 'project authorization', 'project sponsor', 'high-level requirements'],
      filenameKeywords: ['charter', 'authorization']
    },
    {
      type: 'Business Case',
      keywords: ['business case', 'roi', 'return on investment', 'cost-benefit', 'justification'],
      filenameKeywords: ['business_case', 'businesscase', 'justification']
    },
    {
      type: 'Risk Register',
      keywords: ['risk register', 'risk id', 'risk probability', 'risk impact', 'mitigation'],
      filenameKeywords: ['risk', 'risks']
    },
    {
      type: 'Scope Statement',
      keywords: ['scope statement', 'project scope', 'in scope', 'out of scope', 'deliverables'],
      filenameKeywords: ['scope']
    },
    // Add more patterns...
  ];

  let bestMatch = { type: 'Unknown Document', score: 0 };

  for (const pattern of patterns) {
    let score = 0;
    
    // Check content keywords
    for (const keyword of pattern.keywords) {
      if (lowerContent.includes(keyword)) {
        score += 10;
      }
    }
    
    // Check filename keywords (higher weight)
    for (const keyword of pattern.filenameKeywords) {
      if (lowerFilename.includes(keyword)) {
        score += 20;
      }
    }
    
    if (score > bestMatch.score) {
      bestMatch = { type: pattern.type, score };
    }
  }

  const confidence = Math.min(bestMatch.score / 30, 1.0);

  return {
    type: bestMatch.type,
    confidence,
    metadata: {
      method: 'keyword-matching',
      matchScore: bestMatch.score
    }
  };
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Create document record in database
 */
async function createDocumentRecord(
  client: any,
  data: {
    projectId: string;
    uploadedBy: string;
    batchId: string;
    filename: string;
    originalFormat: string;
    markdown: string;
    detectedType: string;
    detectionConfidence: number;
    conversionMetadata: any;
    detectionMetadata: any;
    fileHash: string;
    fileSize: number;
  }
): Promise<string> {
  const documentId = uuidv4();

  const query = `
    INSERT INTO documents (
      id, project_id, title, content, source, format,
      upload_batch_id, original_filename, original_format,
      detected_type, detection_confidence, detection_metadata,
      upload_metadata, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING id
  `;

  const title = data.filename.replace(/\.[^/.]+$/, ''); // Remove extension

  const uploadMetadata = {
    ...data.conversionMetadata,
    file_hash: data.fileHash,
    file_size: data.fileSize,
    upload_date: new Date().toISOString()
  };

  await client.query(query, [
    documentId,
    data.projectId,
    title,
    data.markdown,
    'uploaded',
    'markdown',
    data.batchId,
    data.filename,
    data.originalFormat,
    data.detectedType,
    data.detectionConfidence,
    JSON.stringify(data.detectionMetadata),
    JSON.stringify(uploadMetadata),
    data.uploadedBy
  ]);

  return documentId;
}

/**
 * Update batch progress
 */
async function updateBatchProgress(
  batchId: string,
  result: 'success' | 'failed',
  error?: string
): Promise<void> {
  const field = result === 'success' ? 'successful_files' : 'failed_files';
  
  const query = `
    UPDATE upload_batches
    SET ${field} = ${field} + 1,
        processed_files = processed_files + 1,
        updated_at = NOW()
    WHERE id = $1
    RETURNING total_files, processed_files, successful_files, failed_files
  `;

  const result_db = await pool.query(query, [batchId]);
  
  if (result_db.rows.length > 0) {
    const row = result_db.rows[0];
    
    // Check if batch is complete
    if (row.processed_files >= row.total_files) {
      const status = row.failed_files === 0 ? 'completed' : 
                     row.successful_files === 0 ? 'failed' : 'completed';
      
      await pool.query(`
        UPDATE upload_batches
        SET status = $1, completed_at = NOW()
        WHERE id = $2
      `, [status, batchId]);
    }
  }
}

// ============================================================================
// BATCH STATUS & QUERIES
// ============================================================================

/**
 * Get upload batch status
 */
export async function getBatchStatus(batchId: string): Promise<BatchStatusResponse | null> {
  const batchQuery = `
    SELECT 
      ub.*,
      COALESCE(
        json_agg(
          json_build_object(
            'filename', d.original_filename,
            'status', 'completed',
            'documentId', d.id,
            'detectedType', d.detected_type,
            'qualityScore', qa.overall_score
          )
        ) FILTER (WHERE d.id IS NOT NULL),
        '[]'
      ) as files
    FROM upload_batches ub
    LEFT JOIN documents d ON d.upload_batch_id = ub.id
    LEFT JOIN quality_audits qa ON qa.document_id = d.id
    WHERE ub.id = $1
    GROUP BY ub.id
  `;

  const result = await pool.query(batchQuery, [batchId]);
  
  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];

  return {
    batchId: row.id,
    projectId: row.project_id,
    totalFiles: row.total_files,
    processedFiles: row.processed_files,
    successfulFiles: row.successful_files,
    failedFiles: row.failed_files,
    status: row.status,
    files: row.files,
    createdAt: row.created_at,
    completedAt: row.completed_at
  };
}

/**
 * Get uploaded documents for project
 */
export async function getUploadedDocuments(projectId: string): Promise<any[]> {
  const query = `
    SELECT 
      d.id, d.title, d.original_filename, d.detected_type,
      d.original_format, d.created_at, d.upload_batch_id,
      qa.overall_score, qa.grade
    FROM documents d
    LEFT JOIN quality_audits qa ON qa.document_id = d.id
    WHERE d.project_id = $1 AND d.source = 'uploaded'
    ORDER BY d.created_at DESC
  `;

  const result = await pool.query(query, [projectId]);
  return result.rows;
}

// ============================================================================
// WEBSOCKET EVENTS
// ============================================================================

/**
 * Emit batch progress event
 */
function emitBatchProgress(
  batchId: string,
  projectId: string,
  data: {
    totalFiles: number;
    processedFiles: number;
    status: string;
  }
): void {
  if (io) {
    io.to(`project:${projectId}`).emit('upload:batch:progress', {
      batchId,
      ...data,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Emit file processing progress
 */
function emitFileProgress(
  batchId: string,
  projectId: string,
  filename: string,
  progress: number,
  stage: string,
  error?: string
): void {
  if (io) {
    io.to(`project:${projectId}`).emit('upload:file:progress', {
      batchId,
      filename,
      progress,
      stage,
      error,
      timestamp: new Date().toISOString()
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const documentUploadService = {
  createUploadBatch,
  processUploadedFile,
  getBatchStatus,
  getUploadedDocuments,
  documentUploadQueue
};
