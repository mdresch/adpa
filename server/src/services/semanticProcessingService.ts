/**
 * Semantic Processing Service
 * 
 * Orchestrates asynchronous semantic processing pipeline for onboarding documents:
 * upload → convert → extract → persist → GKG sync
 * 
 * Provides strong traceability with explicit states and operational visibility.
 * Integrates with existing entity extraction framework and GKG sync infrastructure.
 * 
 * @module semanticProcessingService
 */

import { pool } from '../database/connection';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { io } from '../socket';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type SemanticProcessingState =
  | 'uploaded'
  | 'converted'
  | 'queued_extraction'
  | 'extracting'
  | 'extracted'
  | 'queued_gkg_sync'
  | 'syncing'
  | 'synced'
  | 'failed'
  | 'retrying';

export interface SemanticProcessingStatus {
  id: string;
  documentId: string;
  batchId: string | null;
  projectId: string;
  state: SemanticProcessingState;
  uploadedAt: Date;
  convertedAt: Date | null;
  extractionStartedAt: Date | null;
  extractionCompletedAt: Date | null;
  gkgSyncStartedAt: Date | null;
  gkgSyncCompletedAt: Date | null;
  errorMessage: string | null;
  errorDetails: Record<string, unknown> | null;
  retryCount: number;
  maxRetries: number;
  lastRetryAt: Date | null;
  extractionJobId: string | null;
  gkgSyncJobId: string | null;
  extractionSummary: ExtractionSummary | null;
  gkgSyncSummary: GkgSyncSummary | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExtractionSummary {
  entityCounts: Record<string, number>;
  domainsProcessed: string[];
  totalEntities: number;
  processingTimeMs: number;
}

export interface GkgSyncSummary {
  nodesCreated: number;
  nodesUpdated: number;
  relationshipsCreated: number;
  processingTimeMs: number;
}

export interface BatchProcessingStatus {
  id: string;
  batchId: string;
  projectId: string;
  totalDocuments: number;
  documentsConverted: number;
  documentsExtracted: number;
  documentsSynced: number;
  documentsFailed: number;
  overallState: string;
  /** 0–100: share of documents in terminal success or failure */
  progress: number;
  startedAt: Date;
  completedAt: Date | null;
  totalEntitiesExtracted: number;
  totalGkgNodesCreated: number;
  documents: SemanticProcessingStatus[];
}

export interface InitializeProcessingOptions {
  documentId: string;
  batchId: string;
  projectId: string;
  alreadyConverted?: boolean;
}

// ============================================================================
// STATE MACHINE TRANSITIONS
// ============================================================================

const VALID_TRANSITIONS: Record<SemanticProcessingState, SemanticProcessingState[]> = {
  uploaded: ['converted', 'failed'],
  converted: ['queued_extraction', 'failed'],
  queued_extraction: ['extracting', 'failed', 'retrying'],
  extracting: ['extracted', 'failed', 'retrying'],
  extracted: ['queued_gkg_sync', 'failed'],
  queued_gkg_sync: ['syncing', 'failed', 'retrying'],
  syncing: ['synced', 'failed', 'retrying'],
  synced: [], // Terminal state
  failed: ['retrying', 'queued_extraction', 'queued_gkg_sync'], // Can retry from failed
  retrying: ['queued_extraction', 'queued_gkg_sync', 'extracting', 'syncing', 'failed']
};

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

class SemanticProcessingService {
  private readonly LOG_TAG = '[SEMANTIC-PROCESSING]';

  /**
   * Initialize semantic processing for a newly uploaded document
   */
  async initializeProcessing(options: InitializeProcessingOptions): Promise<SemanticProcessingStatus> {
    const { documentId, batchId, projectId, alreadyConverted = false } = options;
    const id = uuidv4();

    logger.info(`${this.LOG_TAG} Initializing processing`, { id, documentId, batchId, projectId });

    const initialState: SemanticProcessingState = alreadyConverted ? 'converted' : 'uploaded';

    const query = `
      INSERT INTO semantic_processing_status (
        id, document_id, batch_id, project_id, state,
        uploaded_at, converted_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      ON CONFLICT (document_id) DO UPDATE SET
        batch_id = EXCLUDED.batch_id,
        state = EXCLUDED.state,
        converted_at = EXCLUDED.converted_at,
        error_message = NULL,
        error_details = NULL,
        updated_at = NOW()
      WHERE semantic_processing_status.state <> 'synced'
      RETURNING *
    `;

    const result = await pool.query(query, [
      id,
      documentId,
      batchId,
      projectId,
      initialState,
      alreadyConverted ? new Date() : null
    ]);

    let row = result.rows[0];
    if (!row) {
      const existing = await pool.query(
        'SELECT * FROM semantic_processing_status WHERE document_id = $1',
        [documentId]
      );
      row = existing.rows[0];
    }
    if (!row) {
      throw new Error(`Failed to initialize semantic processing for document: ${documentId}`);
    }

    const status = this.mapRowToStatus(row);

    // Update document reference
    await pool.query(
      'UPDATE documents SET semantic_processing_id = $1 WHERE id = $2',
      [status.id, documentId]
    );

    // Emit WebSocket event
    this.emitStatusUpdate(status);

    return status;
  }

  /**
   * Mark a batch as failed when orchestration or queue setup fails (documents would otherwise stay "processing" forever).
   */
  async markBatchOrchestrationFailed(batchId: string, reason: string): Promise<void> {
    try {
      const result = await pool.query(
        `UPDATE semantic_processing_batches
         SET overall_state = 'failed',
             completed_at = COALESCE(completed_at, NOW()),
             updated_at = NOW()
         WHERE batch_id = $1`,
        [batchId]
      );
      if (result.rowCount === 0) {
        logger.warn(`${this.LOG_TAG} No semantic_processing_batches row to mark failed`, { batchId, reason });
      } else {
        logger.error(`${this.LOG_TAG} Batch orchestration marked failed`, { batchId, reason });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`${this.LOG_TAG} Failed to persist batch failure state`, { batchId, message });
      throw new Error(`Failed to update batch failure state: ${message}`);
    }
  }

  /**
   * Initialize batch-level tracking
   */
  async initializeBatchProcessing(batchId: string, projectId: string, totalDocuments: number): Promise<void> {
    logger.info(`${this.LOG_TAG} Initializing batch processing`, { batchId, projectId, totalDocuments });

    const query = `
      INSERT INTO semantic_processing_batches (
        id, batch_id, project_id, total_documents, overall_state
      ) VALUES ($1, $2, $3, $4, 'processing')
      ON CONFLICT (batch_id) DO UPDATE SET
        total_documents = GREATEST(semantic_processing_batches.total_documents, EXCLUDED.total_documents),
        overall_state = CASE
          WHEN semantic_processing_batches.overall_state IN ('complete', 'failed', 'partial_failure')
            THEN semantic_processing_batches.overall_state
          ELSE 'processing'
        END,
        updated_at = NOW()
    `;

    await pool.query(query, [uuidv4(), batchId, projectId, totalDocuments]);
  }

  /**
   * Transition document to a new state with validation
   */
  async transitionState(
    documentId: string,
    newState: SemanticProcessingState,
    options?: {
      errorMessage?: string;
      errorDetails?: Record<string, unknown>;
      extractionJobId?: string;
      gkgSyncJobId?: string;
      extractionSummary?: ExtractionSummary;
      gkgSyncSummary?: GkgSyncSummary;
    }
  ): Promise<SemanticProcessingStatus> {
    const currentStatus = await this.getDocumentStatus(documentId);
    
    if (!currentStatus) {
      throw new Error(`No semantic processing record found for document: ${documentId}`);
    }

    // Validate state transition
    const validNextStates = VALID_TRANSITIONS[currentStatus.state];
    if (!validNextStates.includes(newState)) {
      throw new Error(
        `Invalid state transition: ${currentStatus.state} → ${newState}. ` +
        `Valid transitions: ${validNextStates.join(', ')}`
      );
    }

    logger.info(`${this.LOG_TAG} Transitioning state`, {
      documentId,
      from: currentStatus.state,
      to: newState
    });

    // Build dynamic update query
    const updates: string[] = ['state = $2', 'updated_at = NOW()'];
    const params: unknown[] = [documentId, newState];
    let paramIndex = 3;

    // Set timestamp based on new state
    const timestampMap: Partial<Record<SemanticProcessingState, string>> = {
      converted: 'converted_at',
      extracting: 'extraction_started_at',
      extracted: 'extraction_completed_at',
      syncing: 'gkg_sync_started_at',
      synced: 'gkg_sync_completed_at'
    };

    if (timestampMap[newState]) {
      updates.push(`${timestampMap[newState]} = NOW()`);
    }

    // Handle error state
    if (newState === 'failed' && options?.errorMessage) {
      updates.push(`error_message = $${paramIndex++}`);
      params.push(options.errorMessage);
      
      if (options.errorDetails) {
        updates.push(`error_details = $${paramIndex++}`);
        params.push(JSON.stringify(options.errorDetails));
      }
    }

    // Handle retry
    if (newState === 'retrying') {
      updates.push('retry_count = retry_count + 1');
      updates.push('last_retry_at = NOW()');
    }

    // Clear error on successful transition
    if (['converted', 'extracted', 'synced'].includes(newState)) {
      updates.push('error_message = NULL');
      updates.push('error_details = NULL');
    }

    // Job IDs
    if (options?.extractionJobId) {
      updates.push(`extraction_job_id = $${paramIndex++}`);
      params.push(options.extractionJobId);
    }

    if (options?.gkgSyncJobId) {
      updates.push(`gkg_sync_job_id = $${paramIndex++}`);
      params.push(options.gkgSyncJobId);
    }

    // Summaries
    if (options?.extractionSummary) {
      updates.push(`extraction_summary = $${paramIndex++}`);
      params.push(JSON.stringify(options.extractionSummary));
    }

    if (options?.gkgSyncSummary) {
      updates.push(`gkg_sync_summary = $${paramIndex++}`);
      params.push(JSON.stringify(options.gkgSyncSummary));
    }

    const query = `
      UPDATE semantic_processing_status
      SET ${updates.join(', ')}
      WHERE document_id = $1
      RETURNING *
    `;

    const result = await pool.query(query, params);
    const status = this.mapRowToStatus(result.rows[0]);

    // Update batch counters
    if (currentStatus.batchId) {
      await this.updateBatchCounters(currentStatus.batchId);
    }

    // Emit WebSocket event
    this.emitStatusUpdate(status);

    return status;
  }

  /**
   * Mark document as converted (called after document conversion completes)
   */
  async markConverted(documentId: string): Promise<SemanticProcessingStatus> {
    return this.transitionState(documentId, 'converted');
  }

  /**
   * Queue document for extraction
   */
  async queueForExtraction(documentId: string, jobId: string): Promise<SemanticProcessingStatus> {
    return this.transitionState(documentId, 'queued_extraction', { extractionJobId: jobId });
  }

  /**
   * Mark extraction as started
   */
  async markExtractionStarted(documentId: string): Promise<SemanticProcessingStatus> {
    return this.transitionState(documentId, 'extracting');
  }

  /**
   * Mark extraction as completed
   */
  async markExtractionCompleted(
    documentId: string,
    summary: ExtractionSummary
  ): Promise<SemanticProcessingStatus> {
    return this.transitionState(documentId, 'extracted', { extractionSummary: summary });
  }

  /**
   * Queue document for GKG sync
   */
  async queueForGkgSync(documentId: string, jobId: string): Promise<SemanticProcessingStatus> {
    return this.transitionState(documentId, 'queued_gkg_sync', { gkgSyncJobId: jobId });
  }

  /**
   * Mark GKG sync as started
   */
  async markGkgSyncStarted(documentId: string): Promise<SemanticProcessingStatus> {
    return this.transitionState(documentId, 'syncing');
  }

  /**
   * Mark GKG sync as completed (terminal success state)
   */
  async markGkgSyncCompleted(
    documentId: string,
    summary: GkgSyncSummary
  ): Promise<SemanticProcessingStatus> {
    return this.transitionState(documentId, 'synced', { gkgSyncSummary: summary });
  }

  /**
   * Mark document as failed
   */
  async markFailed(
    documentId: string,
    errorMessage: string,
    errorDetails?: Record<string, unknown>
  ): Promise<SemanticProcessingStatus> {
    return this.transitionState(documentId, 'failed', { errorMessage, errorDetails });
  }

  /**
   * Retry failed document processing
   */
  async retry(documentId: string): Promise<SemanticProcessingStatus | null> {
    const status = await this.getDocumentStatus(documentId);
    
    if (!status) {
      throw new Error(`No semantic processing record found for document: ${documentId}`);
    }

    if (status.state !== 'failed') {
      throw new Error(`Cannot retry document in state: ${status.state}. Only failed documents can be retried.`);
    }

    if (status.retryCount >= status.maxRetries) {
      throw new Error(
        `Maximum retries (${status.maxRetries}) exceeded for document: ${documentId}`
      );
    }

    logger.info(`${this.LOG_TAG} Initiating retry`, {
      documentId,
      retryCount: status.retryCount + 1,
      maxRetries: status.maxRetries
    });

    // Determine where to resume based on what was completed
    let resumeState: SemanticProcessingState;
    
    if (!status.extractionCompletedAt) {
      // Extraction not completed, restart from extraction
      resumeState = 'queued_extraction';
    } else if (!status.gkgSyncCompletedAt) {
      // Extraction done but GKG not completed, restart from GKG
      resumeState = 'queued_gkg_sync';
    } else {
      // Everything was done? Shouldn't be in failed state
      logger.warn(`${this.LOG_TAG} Document marked failed but all stages complete`, { documentId });
      return status;
    }

    // Mark as retrying first
    await this.transitionState(documentId, 'retrying');
    
    // Then queue for appropriate stage
    return this.transitionState(documentId, resumeState);
  }

  /**
   * Get status for a single document
   */
  async getDocumentStatus(documentId: string): Promise<SemanticProcessingStatus | null> {
    const query = `
      SELECT * FROM semantic_processing_status
      WHERE document_id = $1
    `;

    const result = await pool.query(query, [documentId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToStatus(result.rows[0]);
  }

  /**
   * Get status for all documents in a batch
   */
  async getBatchStatus(batchId: string): Promise<BatchProcessingStatus | null> {
    // Get batch summary
    const batchQuery = `
      SELECT * FROM semantic_processing_batches
      WHERE batch_id = $1
    `;

    const batchResult = await pool.query(batchQuery, [batchId]);
    
    if (batchResult.rows.length === 0) {
      return null;
    }

    const batch = batchResult.rows[0];

    // Get all document statuses for this batch
    const docsQuery = `
      SELECT * FROM semantic_processing_status
      WHERE batch_id = $1
      ORDER BY created_at ASC
    `;

    const docsResult = await pool.query(docsQuery, [batchId]);
    const documents = docsResult.rows.map(row => this.mapRowToStatus(row));

    const totalDocuments = batch.total_documents as number;
    const documentsSynced = batch.documents_synced as number;
    const documentsFailed = batch.documents_failed as number;
    const progress =
      totalDocuments > 0
        ? Math.round(((documentsSynced + documentsFailed) / totalDocuments) * 100)
        : 0;

    return {
      id: batch.id,
      batchId: batch.batch_id,
      projectId: batch.project_id,
      totalDocuments,
      documentsConverted: batch.documents_converted,
      documentsExtracted: batch.documents_extracted,
      documentsSynced,
      documentsFailed,
      overallState: batch.overall_state,
      progress,
      startedAt: batch.started_at,
      completedAt: batch.completed_at,
      totalEntitiesExtracted: batch.total_entities_extracted,
      totalGkgNodesCreated: batch.total_gkg_nodes_created,
      documents
    };
  }

  /**
   * Get status for all documents in a project
   */
  async getProjectStatus(projectId: string): Promise<SemanticProcessingStatus[]> {
    const query = `
      SELECT * FROM semantic_processing_status
      WHERE project_id = $1
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [projectId]);
    return result.rows.map(row => this.mapRowToStatus(row));
  }

  /**
   * Get documents that need retry (failed with retry count < max)
   */
  async getRetryableDocuments(projectId?: string): Promise<SemanticProcessingStatus[]> {
    let query = `
      SELECT * FROM semantic_processing_status
      WHERE state = 'failed'
        AND retry_count < max_retries
    `;

    const params: string[] = [];
    
    if (projectId) {
      query += ' AND project_id = $1';
      params.push(projectId);
    }

    query += ' ORDER BY created_at ASC';

    const result = await pool.query(query, params);
    return result.rows.map(row => this.mapRowToStatus(row));
  }

  /**
   * Update batch-level counters based on document states
   */
  private async updateBatchCounters(batchId: string): Promise<void> {
    const query = `
      UPDATE semantic_processing_batches
      SET
        documents_converted = (
          SELECT COUNT(*) FROM semantic_processing_status
          WHERE batch_id = $1 AND converted_at IS NOT NULL
        ),
        documents_extracted = (
          SELECT COUNT(*) FROM semantic_processing_status
          WHERE batch_id = $1 AND extraction_completed_at IS NOT NULL
        ),
        documents_synced = (
          SELECT COUNT(*) FROM semantic_processing_status
          WHERE batch_id = $1 AND state = 'synced'
        ),
        documents_failed = (
          SELECT COUNT(*) FROM semantic_processing_status
          WHERE batch_id = $1 AND state = 'failed'
        ),
        total_entities_extracted = COALESCE((
          SELECT SUM((extraction_summary->>'totalEntities')::int)
          FROM semantic_processing_status
          WHERE batch_id = $1 AND extraction_summary IS NOT NULL
        ), 0),
        total_gkg_nodes_created = COALESCE((
          SELECT SUM((gkg_sync_summary->>'nodesCreated')::int)
          FROM semantic_processing_status
          WHERE batch_id = $1 AND gkg_sync_summary IS NOT NULL
        ), 0),
        overall_state = CASE
          WHEN (
            SELECT COUNT(*) FROM semantic_processing_status
            WHERE batch_id = $1 AND state = 'synced'
          ) = total_documents THEN 'complete'
          WHEN (
            SELECT COUNT(*) FROM semantic_processing_status
            WHERE batch_id = $1 AND state = 'failed'
          ) = total_documents THEN 'failed'
          WHEN (
            SELECT COUNT(*) FROM semantic_processing_status
            WHERE batch_id = $1 AND state IN ('synced', 'failed')
          ) = total_documents
          AND (
            SELECT COUNT(*) FROM semantic_processing_status
            WHERE batch_id = $1 AND state = 'failed'
          ) > 0 THEN 'partial_failure'
          ELSE 'processing'
        END,
        completed_at = CASE
          WHEN (
            SELECT COUNT(*) FROM semantic_processing_status
            WHERE batch_id = $1 AND state IN ('synced', 'failed')
          ) = total_documents THEN NOW()
          ELSE NULL
        END,
        updated_at = NOW()
      WHERE batch_id = $1
    `;

    await pool.query(query, [batchId]);

    // Emit batch status update
    const batchStatus = await this.getBatchStatus(batchId);
    if (batchStatus) {
      this.emitBatchStatusUpdate(batchStatus);
    }
  }

  /**
   * Map database row to status object
   */
  private mapRowToStatus(row: Record<string, unknown>): SemanticProcessingStatus {
    return {
      id: row.id as string,
      documentId: row.document_id as string,
      batchId: row.batch_id as string | null,
      projectId: row.project_id as string,
      state: row.state as SemanticProcessingState,
      uploadedAt: row.uploaded_at as Date,
      convertedAt: row.converted_at as Date | null,
      extractionStartedAt: row.extraction_started_at as Date | null,
      extractionCompletedAt: row.extraction_completed_at as Date | null,
      gkgSyncStartedAt: row.gkg_sync_started_at as Date | null,
      gkgSyncCompletedAt: row.gkg_sync_completed_at as Date | null,
      errorMessage: row.error_message as string | null,
      errorDetails: row.error_details as Record<string, unknown> | null,
      retryCount: row.retry_count as number,
      maxRetries: row.max_retries as number,
      lastRetryAt: row.last_retry_at as Date | null,
      extractionJobId: row.extraction_job_id as string | null,
      gkgSyncJobId: row.gkg_sync_job_id as string | null,
      extractionSummary: row.extraction_summary as ExtractionSummary | null,
      gkgSyncSummary: row.gkg_sync_summary as GkgSyncSummary | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date
    };
  }

  /**
   * Emit WebSocket event for document status update
   */
  private emitStatusUpdate(status: SemanticProcessingStatus): void {
    if (io) {
      io.to(`project:${status.projectId}`).emit('semantic:document:status', {
        documentId: status.documentId,
        state: status.state,
        errorMessage: status.errorMessage,
        retryCount: status.retryCount,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Emit WebSocket event for batch status update
   */
  private emitBatchStatusUpdate(batch: BatchProcessingStatus): void {
    if (io) {
      io.to(`project:${batch.projectId}`).emit('semantic:batch:status', {
        batchId: batch.batchId,
        overallState: batch.overallState,
        totalDocuments: batch.totalDocuments,
        documentsConverted: batch.documentsConverted,
        documentsExtracted: batch.documentsExtracted,
        documentsSynced: batch.documentsSynced,
        documentsFailed: batch.documentsFailed,
        progress: batch.progress,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Export singleton instance
export const semanticProcessingService = new SemanticProcessingService();

export default semanticProcessingService;
