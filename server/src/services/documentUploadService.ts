; (async function () { try { await (require('../lib/db')).initDb() } catch (e) { } })();
/**
 * Document Upload Service
 * 
 * Handles bulk document uploads for client onboarding assessment.
 * Manages upload batches, file processing, and progress tracking.
 * 
 * @module documentUploadService
 */

const db = require('../lib/db');
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { logger } from '../utils/logger';
import { pool } from '../database/connection'; // Use shared pool with correct SSL config
import { documentConversionService, ConversionOptions } from './documentConversionService';
import { qualityAuditService } from './qualityAuditService';
import { portfolioAssessmentService } from './portfolioAssessmentService';
import { io } from '@/socket'; // WebSocket for real-time updates
import { documentUploadQueue } from './queueService';
import type { IQueueJob } from './jobs/queue/IQueue';

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

// Use shared pool imported from ../database/connection (has correct Supabase SSL config)

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

    // Create assessment record immediately for progress tracking
    const assessmentQuery = `
      INSERT INTO assessments (
        id, batch_id, project_id, total_documents, status, 
        overall_maturity_level, maturity_label, avg_quality_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;

    const assessmentId = uuidv4();
    await client.query(assessmentQuery, [
      assessmentId,
      batchId,
      projectId,
      files.length,
      'processing',
      1, // Default level, will be updated
      'Processing',
      0.00
    ]);

    logger.info('Assessment record created', {
      assessmentId,
      batchId,
      projectId
    });

    await client.query('COMMIT');

    // Enqueue files for processing (parallel)
    const jobs = await Promise.all(
      files.map((file, index) =>
        enqueueFileProcessing(batchId, projectId, uploadedBy, file, index)
      )
    );

    logger.info('Upload batch created and files enqueued', {
      batchId,
      jobCount: jobs.length,
      assessmentId
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
 * Add documents to existing batch
 * Allows users to enhance their assessment with additional documents
 */
export async function addDocumentsToExistingBatch(
  batchId: string,
  files: Express.Multer.File[]
): Promise<UploadBatchResult> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get existing batch info
    const batchResult = await client.query(
      'SELECT * FROM upload_batches WHERE id = $1',
      [batchId]
    );

    if (batchResult.rows.length === 0) {
      throw new Error('Batch not found');
    }

    const batch = batchResult.rows[0];
    const { project_id: projectId, uploaded_by: uploadedBy } = batch;

    // Update batch with new file count
    const newTotalFiles = batch.total_files + files.length;
    await client.query(
      `UPDATE upload_batches 
       SET total_files = $1, 
           status = 'processing',
           updated_at = NOW()
       WHERE id = $2`,
      [newTotalFiles, batchId]
    );

    logger.info('Adding documents to existing batch', {
      batchId,
      existingFiles: batch.total_files,
      newFiles: files.length,
      newTotal: newTotalFiles
    });

    await client.query('COMMIT');

    // Enqueue new files for processing
    const jobs = await Promise.all(
      files.map((file, index) =>
        enqueueFileProcessing(
          batchId,
          projectId,
          uploadedBy,
          file,
          batch.total_files + index // Continue numbering from existing
        )
      )
    );

    logger.info('Additional files enqueued', {
      batchId,
      newJobCount: jobs.length
    });

    // Emit WebSocket event
    emitBatchProgress(batchId, projectId, {
      totalFiles: newTotalFiles,
      processedFiles: batch.successful_files + batch.failed_files,
      status: 'processing'
    });

    return {
      batchId,
      totalFiles: newTotalFiles,
      status: 'processing',
      createdAt: batch.created_at
    };

  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Failed to add documents to batch', {
      error: error.message,
      batchId
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
): Promise<IQueueJob<FileProcessingJob>> {
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

  return await documentUploadQueue.add('file-process', jobData, {
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
  job: IQueueJob<FileProcessingJob>
): Promise<FileProcessingResult> {
  const { batchId, fileId, projectId, uploadedBy, filename, originalFormat, buffer, fileHash } = job.data;

  // CRITICAL FIX: Bull serializes Buffers to Redis as plain objects {type: 'Buffer', data: [...]}
  // We must convert them back to proper Buffer objects
  const actualBuffer = Buffer.isBuffer(buffer)
    ? buffer
    : Buffer.from((buffer as any).data || buffer);

  logger.info('Processing uploaded file', {
    batchId,
    fileId,
    filename,
    format: originalFormat,
    size: actualBuffer.length,
    bufferType: Buffer.isBuffer(buffer) ? 'Buffer' : typeof buffer
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
      actualBuffer,
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
    // CRITICAL: Ensure markdown is a string, not an object
    let markdownContent = conversionResult.markdown;
    if (typeof markdownContent !== 'string') {
      logger.error('Conversion result markdown is not a string', {
        filename,
        markdownType: typeof markdownContent,
        markdownValue: markdownContent
      });

      // Extract string from object if it's an object
      if (markdownContent && typeof markdownContent === 'object') {
        markdownContent = (markdownContent as any).text || (markdownContent as any).content || (markdownContent as any).markdown || JSON.stringify(markdownContent);
      } else {
        markdownContent = String(markdownContent || '');
      }

      logger.warn('Converted markdown to string', {
        filename,
        finalType: typeof markdownContent,
        length: markdownContent.length
      });
    }

    // Validate markdown is not empty
    if (!markdownContent || markdownContent.trim() === '') {
      throw new Error(`PDF conversion resulted in empty Markdown content for file: ${filename}`);
    }

    const documentId = await createDocumentRecord(client, {
      projectId,
      uploadedBy,
      batchId,
      filename,
      originalFormat,
      markdown: markdownContent, // Ensure it's a string
      detectedType: detectionResult.type,
      detectionConfidence: detectionResult.confidence,
      conversionMetadata: conversionResult.metadata,
      detectionMetadata: detectionResult.metadata,
      fileHash,
      fileSize: actualBuffer.length
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

    // Step 5: Trigger Drift Detection (if project has approved baseline)
    try {
      const { driftDetectionService } = await Promise.resolve().then(() => require());

      logger.info('🚨 [DRIFT] Checking for approved baseline', { projectId, documentId });

      // Check if project has an approved baseline
      const baselineCheck = await client.query(
        `SELECT id, version, status FROM project_baselines 
         WHERE project_id = $1 AND status = 'approved' 
         ORDER BY approved_at DESC LIMIT 1`,
        [projectId]
      );

      if (baselineCheck.rows.length > 0) {
        const baseline = baselineCheck.rows[0];
        logger.info('🚨 [DRIFT] Approved baseline found - triggering drift detection', {
          baselineId: baseline.id,
          baselineVersion: baseline.version,
          documentId,
          filename
        });

        // Trigger drift detection asynchronously (don't block the upload)
        driftDetectionService.checkForDrift(projectId, documentId)
          .then(async driftResult => {
            if (driftResult.hasDrift) {
              logger.info('🚨 [DRIFT] Drift detected in uploaded document!', {
                documentId,
                filename,
                severity: driftResult.severity,
                driftCount: driftResult.driftPoints.length
              });

              // Save drift record to database
              try {
                const driftRecord = await driftDetectionService.createDriftRecord({
                  projectId,
                  documentId,
                  baselineId: baseline.id,
                  driftPoints: driftResult.driftPoints,
                  severity: driftResult.severity,
                  triggeredBy: uploadedBy
                });

                logger.info('💾 [DRIFT] Drift record saved', {
                  driftRecordId: driftRecord.id,
                  severity: driftRecord.drift_severity,
                  driftCount: driftResult.driftPoints.length
                });

                // Trigger escalation check (TASK-742: Escalation matrix)
                // Always check escalation regardless of severity - the matrix rules decide if escalation is needed
                try {
                  await driftDetectionService.checkAndTriggerEscalation(driftRecord, driftResult.driftPoints);
                  logger.info('✅ [DRIFT] Escalation check completed', { driftRecordId: driftRecord.id });
                } catch (escalationError: any) {
                  logger.error('❌ [DRIFT] Error triggering escalation:', {
                    driftRecordId: driftRecord.id,
                    error: escalationError.message
                  });
                  // Don't fail the drift detection if escalation fails
                }

              } catch (saveError: any) {
                logger.error('❌ [DRIFT] Failed to save drift record', {
                  documentId,
                  error: saveError.message
                });
              }
            } else {
              logger.info('✅ [DRIFT] No drift detected - document aligns with baseline', {
                documentId,
                filename
              });
            }
          })
          .catch(driftError => {
            logger.error('❌ [DRIFT] Drift detection failed', {
              documentId,
              filename,
              error: driftError.message
            });
            // Don't fail the upload if drift detection fails
          });
      } else {
        logger.info('ℹ️ [DRIFT] No approved baseline found - skipping drift detection', { projectId });
      }
    } catch (driftImportError: any) {
      logger.error('❌ [DRIFT] Failed to import drift detection service', {
        error: driftImportError.message
      });
      // Don't fail the upload if drift detection import fails
    }

    await job.progress(100);
    emitFileProgress(batchId, projectId, filename, 100, 'Completed');

    // Update batch progress (pass fileId to prevent double-counting on retries)
    await updateBatchProgress(batchId, 'success', fileId);

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

    // Update batch progress (pass fileId to prevent double-counting on retries)
    await updateBatchProgress(batchId, 'failed', fileId, error.message);

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
  // Use AI service with automatic failover instead of hardcoded Google AI
  const { aiService } = await Promise.resolve().then(() => require());

  try {
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

    // Use AI service with automatic failover
    const result = await aiService.generateWithFallback({
      provider: 'auto', // Automatically use highest priority active provider
      prompt,
      temperature: 0.3,
      max_tokens: 500
    });

    // Extract JSON from response
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      type: parsed.type,
      confidence: parsed.confidence,
      metadata: {
        aiProvider: result.providerUsed,
        model: result.model,
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

  // CRITICAL: Ensure markdown is a string, never an object
  let markdownContent = data.markdown;
  if (typeof markdownContent !== 'string') {
    logger.error('createDocumentRecord received non-string markdown', {
      filename: data.filename,
      markdownType: typeof markdownContent,
      markdownValue: markdownContent
    });

    // Extract string from object if it's an object
    if (markdownContent && typeof markdownContent === 'object') {
      markdownContent = (markdownContent as any).text || (markdownContent as any).content || (markdownContent as any).markdown || JSON.stringify(markdownContent);
      logger.warn('Extracted string from markdown object', {
        filename: data.filename,
        extractedLength: markdownContent.length
      });
    } else {
      markdownContent = String(markdownContent || '');
    }
  }

  // Validate markdown is not empty
  if (!markdownContent || markdownContent.trim() === '') {
    throw new Error(`Cannot create document record with empty Markdown content for file: ${data.filename}`);
  }

  // Use actual documents table schema (from information_schema check)
  const query = `
    INSERT INTO documents (
      id, project_id, name, title, content, source, framework,
      metadata, created_by, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    RETURNING id
  `;

  const documentName = data.filename.replace(/\.[^/.]+$/, ''); // Remove extension
  const documentTitle = documentName.replace(/[-_]/g, ' '); // Make title readable

  // Store all metadata in JSONB metadata column
  const metadata = {
    // Original file info
    original_filename: data.filename,
    original_format: data.originalFormat,
    file_hash: data.fileHash,
    file_size: data.fileSize,

    // Processing info
    format: 'markdown',
    detected_type: data.detectedType,
    detection_confidence: data.detectionConfidence,
    detection_metadata: data.detectionMetadata,

    // Conversion info
    conversion_metadata: data.conversionMetadata,

    // Batch tracking
    upload_batch_id: data.batchId,
    upload_date: new Date().toISOString()
  };

  await client.query(query, [
    documentId,
    data.projectId,
    documentName, // name
    documentTitle, // title
    markdownContent, // content (Markdown string - NEVER an object)
    'upload', // source
    data.detectedType || 'Unknown', // framework (document type)
    JSON.stringify(metadata), // metadata (JSONB - all extra data)
    data.uploadedBy // created_by
  ]);

  logger.info('Document record created with Markdown content', {
    documentId,
    filename: data.filename,
    contentLength: markdownContent.length,
    contentType: typeof markdownContent
  });

  return documentId;
}

/**
 * Update batch progress
 * Only counts unique files, not retry attempts
 * Uses batch metadata to track processed file IDs
 */
async function updateBatchProgress(
  batchId: string,
  result: 'success' | 'failed',
  fileId?: string,
  error?: string
): Promise<void> {
  try {
    // Get current batch metadata to check if file already counted
    const batchQuery = `
      SELECT batch_metadata, successful_files, failed_files, total_files
      FROM upload_batches
      WHERE id = $1
    `;

    const batchResult = await db.query(batchQuery, [batchId]);
    if (batchResult.rows.length === 0) return;

    const batch = batchResult.rows[0];
    const metadata = batch.batch_metadata || {};
    const processedFiles = metadata.processed_file_ids || [];

    // Check if this file was already counted
    if (fileId && processedFiles.includes(fileId)) {
      logger.debug('File already counted, skipping increment', { batchId, fileId });
      return; // Already counted, skip to prevent retry inflation
    }

    // Add fileId to processed list
    if (fileId) {
      processedFiles.push(fileId);
      metadata.processed_file_ids = processedFiles;
    }

    // Update batch counters (only increment once per unique file)
    const field = result === 'success' ? 'successful_files' : 'failed_files';

    const updateQuery = `
      UPDATE upload_batches
      SET ${field} = ${field} + 1,
          processed_files = successful_files + failed_files + 1,
          batch_metadata = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING total_files, processed_files, successful_files, failed_files
    `;

    const result_db = await db.query(updateQuery, [batchId, JSON.stringify(metadata)]);

    if (result_db.rows.length > 0) {
      const row = result_db.rows[0];

      // Check if batch is complete
      if (row.processed_files >= row.total_files) {
        const status = row.failed_files === 0 ? 'complete' :
          row.successful_files === 0 ? 'failed' : 'complete';

        // Get batch info for assessment generation
        const batchInfoQuery = `
          SELECT project_id, uploaded_by, batch_metadata
          FROM upload_batches
          WHERE id = $1
        `;
        const batchInfoResult = await db.query(batchInfoQuery, [batchId]);

        if (batchInfoResult.rows.length > 0) {
          const batchInfo = batchInfoResult.rows[0];
          const projectId = batchInfo.project_id;
          const uploadedBy = batchInfo.uploaded_by;
          const industryVertical = batchInfo.batch_metadata?.industryVertical || 'technology';

          // Update batch status
          await db.query(`
            UPDATE upload_batches
            SET status = $1, completed_at = NOW()
            WHERE id = $2
          `, [status, batchId]);

          logger.info('Upload batch completed', {
            batchId,
            status,
            successful: row.successful_files,
            failed: row.failed_files,
            total: row.total_files
          });

          // Generate assessment if batch completed successfully
          if (status === 'complete' && row.successful_files > 0) {
            try {
              logger.info('Generating assessment for completed batch', {
                batchId,
                projectId,
                uploadedBy
              });

              // Generate portfolio assessment
              const assessmentResult = await portfolioAssessmentService.assessProjectPortfolio(
                projectId,
                industryVertical,
                uploadedBy
              );

              // Prepare gaps array from gap analysis
              const allGaps = [
                ...(assessmentResult.gap_analysis?.critical_gaps || []).map((g: any) => ({ ...g, priority: 'critical' })),
                ...(assessmentResult.gap_analysis?.high_priority_gaps || []).map((g: any) => ({ ...g, priority: 'high' })),
                ...(assessmentResult.gap_analysis?.medium_priority_gaps || []).map((g: any) => ({ ...g, priority: 'medium' }))
              ];

              const gapsCount = allGaps.length;

              // Prepare assessment data with all calculated metrics
              const assessmentData = {
                portfolio_summary: assessmentResult.portfolio_summary,
                breakdown: assessmentResult.breakdown,
                gap_analysis: assessmentResult.gap_analysis,
                top_documents: assessmentResult.top_documents
              };

              // Update the assessments table record with calculated values
              const assessmentUpdateQuery = `
                UPDATE assessments
                SET 
                  overall_maturity_level = $1,
                  maturity_label = $2,
                  avg_quality_score = $3,
                  gaps_count = $4,
                  assessment_data = $5,
                  gaps = $6,
                  benchmarks = $7,
                  roi_metrics = $8,
                  status = 'complete',
                  completed_at = NOW(),
                  updated_at = NOW()
                WHERE batch_id = $9
                RETURNING id
              `;

              const assessmentUpdateResult = await db.query(assessmentUpdateQuery, [
                assessmentResult.portfolio_summary.maturity_level,
                assessmentResult.portfolio_summary.maturity_label,
                assessmentResult.portfolio_summary.avg_quality_score,
                gapsCount,
                JSON.stringify(assessmentData),
                JSON.stringify(allGaps),
                JSON.stringify({
                  industryAverage: assessmentResult.portfolio_summary.industry_benchmark || null,
                  topPerformers: null,
                  yourScore: assessmentResult.portfolio_summary.avg_quality_score,
                  percentile: null
                }),
                JSON.stringify(assessmentResult.roi_calculation || {}),
                batchId
              ]);

              if (assessmentUpdateResult.rows.length > 0) {
                logger.info('Assessment updated successfully', {
                  assessmentId: assessmentUpdateResult.rows[0].id,
                  batchId,
                  maturityLevel: assessmentResult.portfolio_summary.maturity_level,
                  avgScore: assessmentResult.portfolio_summary.avg_quality_score
                });
              }

            } catch (assessmentError: any) {
              // Log error but don't fail the batch completion
              logger.error('Failed to generate assessment after batch completion', {
                batchId,
                projectId,
                error: assessmentError.message,
                stack: assessmentError.stack
              });

              // Update assessment status to 'failed' if generation failed
              await db.query(`
                UPDATE assessments
                SET status = 'failed',
                    updated_at = NOW()
                WHERE batch_id = $1
              `, [batchId]);
            }

            // Semantic pipeline runs independently of assessment generation success
            triggerSemanticProcessing(batchId, projectId, uploadedBy).catch((err: Error) => {
              logger.error('Failed to trigger semantic processing', {
                batchId,
                projectId,
                error: err.message
              });
            });
          } else if (status === 'failed') {
            // Update assessment status to 'failed' if batch failed
            await db.query(`
              UPDATE assessments
              SET status = 'failed',
                  updated_at = NOW()
              WHERE batch_id = $1
            `, [batchId]);
          }
        }
      }
    }
  } catch (error: any) {
    logger.error('Failed to update batch progress', {
      batchId,
      error: error.message
    });
    // Don't throw - allow job to complete even if progress update fails
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
    LEFT JOIN documents d ON (d.metadata->>'upload_batch_id')::uuid = ub.id
    LEFT JOIN LATERAL (
      SELECT qa.overall_score
      FROM quality_audits qa
      WHERE qa.document_id = d.id
        AND COALESCE(qa.audit_performed, true) = true
        AND qa.overall_score IS NOT NULL
      ORDER BY qa.audited_at DESC
      LIMIT 1
    ) qa ON true
    WHERE ub.id = $1
    GROUP BY ub.id
  `;

  const result = await db.query(batchQuery, [batchId]);

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
      d.original_format, d.created_at, 
      (d.metadata->>'upload_batch_id')::uuid as upload_batch_id,
      qa.overall_score, qa.overall_grade
    FROM documents d
    LEFT JOIN LATERAL (
      SELECT qa.overall_score, qa.overall_grade
      FROM quality_audits qa
      WHERE qa.document_id = d.id
        AND COALESCE(qa.audit_performed, true) = true
        AND qa.overall_score IS NOT NULL
      ORDER BY qa.audited_at DESC
      LIMIT 1
    ) qa ON true
    WHERE d.project_id = $1 AND d.source = 'uploaded'
    ORDER BY d.created_at DESC
  `;

  const result = await db.query(query, [projectId]);
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
// SEMANTIC PROCESSING TRIGGER
// ============================================================================

/**
 * Trigger async semantic processing for all documents in a completed batch
 * This runs in the background and does not block the upload completion
 */
async function triggerSemanticProcessing(
  batchId: string,
  projectId: string,
  uploadedBy: string
): Promise<void> {
  logger.info('🚀 [SEMANTIC] Triggering semantic processing for batch', {
    batchId,
    projectId
  });

  try {
    // Import semantic processing service and queue
    const { semanticProcessingService } = await Promise.resolve().then(() => require());
    const { semanticProcessingQueue } = await Promise.resolve().then(() => require());

    // Get all successfully processed documents from this batch
    const docsQuery = `
      SELECT d.id, d.project_id
      FROM documents d
      WHERE (d.metadata->>'upload_batch_id')::uuid = $1
        AND d.content IS NOT NULL
        AND d.content != ''
    `;

    const docsResult = await db.query(docsQuery, [batchId]);
    const documentIds = docsResult.rows.map((row: { id: string }) => row.id);

    if (documentIds.length === 0) {
      logger.info('[SEMANTIC] No documents to process in batch', { batchId });
      return;
    }

    logger.info('[SEMANTIC] Found documents for semantic processing', {
      batchId,
      documentCount: documentIds.length
    });

    // Initialize batch-level tracking
    await semanticProcessingService.initializeBatchProcessing(
      batchId,
      projectId,
      documentIds.length
    );

    // Initialize processing status for each document
    for (const documentId of documentIds) {
      await semanticProcessingService.initializeProcessing({
        documentId,
        batchId,
        projectId,
        alreadyConverted: true // Documents are already converted to Markdown
      });
    }

    // Enqueue batch processing job
    const jobId = `semantic-batch-${batchId}`;
    await semanticProcessingQueue.add('semantic-process-batch', {
      batchId,
      projectId,
      userId: uploadedBy,
      documentIds
    }, {
      jobId,
      priority: 5 // Medium priority
    });

    logger.info('✅ [SEMANTIC] Batch semantic processing job enqueued', {
      batchId,
      projectId,
      jobId,
      documentCount: documentIds.length
    });

  } catch (error: any) {
    logger.error('❌ [SEMANTIC] Failed to trigger semantic processing', {
      batchId,
      projectId,
      error: error.message,
      stack: error.stack
    });
    try {
      const { semanticProcessingService } = await Promise.resolve().then(() => require());
      await semanticProcessingService.markBatchOrchestrationFailed(
        batchId,
        error instanceof Error ? error.message : String(error)
      );
    } catch (markErr: unknown) {
      logger.error('❌ [SEMANTIC] Failed to mark batch as failed after trigger error', {
        batchId,
        error: markErr instanceof Error ? markErr.message : String(markErr)
      });
    }
    // Don't rethrow - semantic processing failure shouldn't fail the upload
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const documentUploadService = {
  createUploadBatch,
  addDocumentsToExistingBatch,
  processUploadedFile,
  getBatchStatus,
  getUploadedDocuments,
  triggerSemanticProcessing
};
