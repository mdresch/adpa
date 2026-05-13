/**
 * Semantic Processing Job Service
 * 
 * Handles background processing of semantic pipeline jobs:
 * - semantic-process-document: Process single document through extraction → GKG sync
 * - semantic-process-batch: Process all documents in a batch
 * 
 * Integrates with existing ExtractionOrchestrationService and GKG sync infrastructure.
 * 
 * @module SemanticProcessingJobService
 */

import { pool } from '@/database/connection';
import { logger } from '@/utils/logger';
import type { IQueueJob } from './queue/IQueue';
import { semanticProcessingService, type ExtractionSummary, type GkgSyncSummary } from '../semanticProcessingService';

// ============================================================================
// TYPES
// ============================================================================

export interface SemanticProcessDocumentJobData {
  documentId: string;
  projectId: string;
  batchId?: string;
  userId: string;
  skipExtraction?: boolean;
  skipGkgSync?: boolean;
}

export interface SemanticProcessBatchJobData {
  batchId: string;
  projectId: string;
  userId: string;
  documentIds: string[];
}

// ============================================================================
// JOB PROCESSOR
// ============================================================================

const LOG_TAG = '[SEMANTIC-JOB]';

/**
 * Process a single document through semantic pipeline
 */
export async function processSemanticDocument(
  job: IQueueJob<SemanticProcessDocumentJobData>
): Promise<{ success: boolean; documentId: string; error?: string }> {
  const { documentId, projectId, batchId, userId, skipExtraction, skipGkgSync } = job.data;
  const startTime = Date.now();

  logger.info(`${LOG_TAG} Starting semantic processing`, { 
    documentId, 
    projectId, 
    batchId,
    jobId: job.id 
  });

  try {
    // Extraction: state machine requires converted → queued_extraction → extracting
    if (!skipExtraction) {
      let procState = await semanticProcessingService.getDocumentStatus(documentId);
      if (!procState) {
        throw new Error(`No semantic processing record found for document: ${documentId}`);
      }

      if (procState.state === 'converted') {
        await semanticProcessingService.queueForExtraction(documentId, String(job.id));
        procState = await semanticProcessingService.getDocumentStatus(documentId);
        if (!procState) {
          throw new Error(`Semantic processing record disappeared for document: ${documentId}`);
        }
      }

      if (procState.state === 'queued_extraction') {
        await semanticProcessingService.markExtractionStarted(documentId);
      } else if (procState.state === 'extracting') {
        logger.info(`${LOG_TAG} Resuming extraction`, { documentId });
      } else {
        throw new Error(
          `Cannot start extraction: document ${documentId} is in state ${procState.state}`
        );
      }

      await job.progress(10);

      const extractionResult = await runEntityExtraction(documentId, projectId, userId);

      await job.progress(50);

      await semanticProcessingService.markExtractionCompleted(documentId, extractionResult);

      logger.info(`${LOG_TAG} Extraction completed`, {
        documentId,
        totalEntities: extractionResult.totalEntities,
        domains: extractionResult.domainsProcessed
      });
    }

    // GKG sync: extracted → queued_gkg_sync → syncing → synced (do not re-queue if already queued_gkg_sync)
    if (!skipGkgSync) {
      const { isNeo4jConfigured } = await import('../../utils/neo4j');

      let docState = await semanticProcessingService.getDocumentStatus(documentId);
      if (!docState) {
        throw new Error(`No semantic processing record found for document: ${documentId}`);
      }

      if (isNeo4jConfigured()) {
        if (docState.state === 'extracted') {
          await semanticProcessingService.queueForGkgSync(documentId, String(job.id));
          docState = await semanticProcessingService.getDocumentStatus(documentId);
          if (!docState) {
            throw new Error(`Semantic processing record disappeared for document: ${documentId}`);
          }
        }

        if (docState.state === 'queued_gkg_sync') {
          await semanticProcessingService.markGkgSyncStarted(documentId);
        } else if (docState.state === 'syncing') {
          logger.info(`${LOG_TAG} Resuming GKG sync`, { documentId });
        } else {
          throw new Error(
            `Cannot run GKG sync: document ${documentId} is in state ${docState.state}`
          );
        }

        await job.progress(60);
        await job.progress(70);

        const gkgResult = await runGkgSync(documentId, projectId);

        await job.progress(95);

        await semanticProcessingService.markGkgSyncCompleted(documentId, gkgResult);

        logger.info(`${LOG_TAG} GKG sync completed`, {
          documentId,
          nodesCreated: gkgResult.nodesCreated
        });
      } else {
        logger.info(`${LOG_TAG} Neo4j not configured, skipping GKG sync`, { documentId });
        if (docState.state === 'extracted') {
          await semanticProcessingService.queueForGkgSync(documentId, String(job.id));
          docState = await semanticProcessingService.getDocumentStatus(documentId);
          if (!docState) {
            throw new Error(`Semantic processing record disappeared for document: ${documentId}`);
          }
        }
        if (docState.state !== 'queued_gkg_sync') {
          throw new Error(
            `Neo4j skip path: expected queued_gkg_sync before marking synced, got ${docState.state}`
          );
        }
        await semanticProcessingService.markGkgSyncStarted(documentId);
        await semanticProcessingService.markGkgSyncCompleted(documentId, {
          nodesCreated: 0,
          nodesUpdated: 0,
          relationshipsCreated: 0,
          processingTimeMs: 0
        });
      }
    }

    await job.progress(100);

    const processingTimeMs = Date.now() - startTime;
    logger.info(`${LOG_TAG} Semantic processing complete`, {
      documentId,
      processingTimeMs
    });

    return { success: true, documentId };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error(`${LOG_TAG} Semantic processing failed`, {
      documentId,
      error: errorMessage,
      stack: errorStack
    });

    // Mark as failed
    await semanticProcessingService.markFailed(documentId, errorMessage, {
      jobId: job.id,
      stack: errorStack
    });

    return { success: false, documentId, error: errorMessage };
  }
}

/**
 * Process all documents in a batch through semantic pipeline
 */
export async function processSemanticBatch(
  job: IQueueJob<SemanticProcessBatchJobData>
): Promise<{ success: boolean; processed: number; failed: number }> {
  const { batchId, projectId, userId, documentIds } = job.data;

  logger.info(`${LOG_TAG} Starting batch semantic processing`, {
    batchId,
    projectId,
    documentCount: documentIds.length
  });

  let processed = 0;
  let failed = 0;

  try {
    for (let i = 0; i < documentIds.length; i++) {
      const documentId = documentIds[i];
      const progress = Math.round(((i + 1) / documentIds.length) * 100);

      try {
        // Create a synthetic job for the document processor
        const docJob: IQueueJob<SemanticProcessDocumentJobData> = {
          id: `${job.id}-doc-${i}`,
          data: {
            documentId,
            projectId,
            batchId,
            userId
          },
          progress: async () => {},
          log: async () => {},
          update: async () => {},
          remove: async () => {},
          retry: async () => {},
          getState: async () => 'active',
          finished: async () => {},
          failed: async () => {},
          toJSON: () => ({})
        };

        const result = await processSemanticDocument(docJob);

        if (result.success) {
          processed++;
        } else {
          failed++;
        }
      } catch (error) {
        logger.error(`${LOG_TAG} Document processing failed in batch`, {
          batchId,
          documentId,
          error: error instanceof Error ? error.message : String(error)
        });
        failed++;
      }

      await job.progress(progress);
    }

    logger.info(`${LOG_TAG} Batch semantic processing complete`, {
      batchId,
      processed,
      failed,
      total: documentIds.length
    });

    return { success: failed === 0, processed, failed };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`${LOG_TAG} Batch semantic processing aborted`, {
      batchId,
      error: message,
      stack: error instanceof Error ? error.stack : undefined
    });
    try {
      await semanticProcessingService.markBatchOrchestrationFailed(batchId, message);
    } catch (markErr: unknown) {
      logger.error(`${LOG_TAG} Could not mark batch failed after batch job error`, {
        batchId,
        error: markErr instanceof Error ? markErr.message : String(markErr)
      });
    }
    throw error;
  }
}

// ============================================================================
// ENTITY EXTRACTION (using existing framework)
// ============================================================================

/**
 * Run entity extraction using AI-based lightweight extraction
 * Extracts basic entities directly from document content
 */
async function runEntityExtraction(
  documentId: string,
  projectId: string,
  _userId: string
): Promise<ExtractionSummary> {
  // Use lightweight extraction (AI-based entity extraction)
  // The full extraction orchestration service requires additional setup
  // For the onboarding pipeline, we use a simpler approach
  return await runLightweightExtraction(documentId, projectId);
}

/**
 * Lightweight extraction fallback when full extraction service is unavailable
 * Uses AI to extract basic entities directly
 */
async function runLightweightExtraction(
  documentId: string,
  projectId: string
): Promise<ExtractionSummary> {
  const startTime = Date.now();

  try {
    // Get document content
    const docResult = await pool.query(
      'SELECT content FROM documents WHERE id = $1',
      [documentId]
    );

    if (docResult.rows.length === 0) {
      throw new Error(`Document not found: ${documentId}`);
    }

    const content = docResult.rows[0].content || '';
    
    // Skip if no content
    if (!content.trim()) {
      return {
        entityCounts: {},
        domainsProcessed: [],
        totalEntities: 0,
        processingTimeMs: Date.now() - startTime
      };
    }

    // Use AI service to extract basic entities
    const { aiService } = await import('../aiService');
    
    const prompt = `Extract key project management entities from this document.
Return a JSON object with entity counts by type.

Document content (first 4000 chars):
${content.substring(0, 4000)}

Return JSON in this format:
{
  "stakeholders": 0,
  "requirements": 0,
  "risks": 0,
  "milestones": 0,
  "deliverables": 0,
  "constraints": 0
}`;

    const result = await aiService.generateWithFallback({
      provider: 'auto',
      prompt,
      temperature: 0.3,
      max_tokens: 500
    });

    // Parse result
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    let entityCounts: Record<string, number> = {};
    
    if (jsonMatch) {
      try {
        entityCounts = JSON.parse(jsonMatch[0]);
      } catch {
        logger.warn(`${LOG_TAG} Failed to parse extraction result`, { documentId });
      }
    }

    const totalEntities = Object.values(entityCounts).reduce((sum, count) => sum + count, 0);
    const domainsProcessed = Object.keys(entityCounts).filter(k => entityCounts[k] > 0);

    return {
      entityCounts,
      domainsProcessed,
      totalEntities,
      processingTimeMs: Date.now() - startTime
    };

  } catch (error) {
    logger.error(`${LOG_TAG} Lightweight extraction failed`, {
      documentId,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

// ============================================================================
// GKG SYNC (using existing framework)
// ============================================================================

/**
 * Run GKG sync using the existing GKG sync infrastructure
 */
async function runGkgSync(
  documentId: string,
  projectId: string
): Promise<GkgSyncSummary> {
  const startTime = Date.now();

  try {
    const { isNeo4jConfigured, getNeo4jDriver, getNeo4jDatabase } = await import('../../utils/neo4j');
    
    if (!isNeo4jConfigured()) {
      return {
        nodesCreated: 0,
        nodesUpdated: 0,
        relationshipsCreated: 0,
        processingTimeMs: Date.now() - startTime
      };
    }

    const driver = getNeo4jDriver();
    
    // Use the existing syncProject function
    const { runSyncProject } = await import('../gkg/syncProject');
    
    const result = await runSyncProject(pool, driver, getNeo4jDatabase(), projectId);

    return {
      nodesCreated: result.units + result.documents + (result.project ? 1 : 0),
      nodesUpdated: 0,
      relationshipsCreated: result.dependencies + result.tasks,
      processingTimeMs: Date.now() - startTime
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // If GKG service not available, return empty result
    if (errorMessage.includes('Cannot find module') || errorMessage.includes('not configured')) {
      logger.warn(`${LOG_TAG} GKG sync service not available`, { documentId, projectId });
      
      return {
        nodesCreated: 0,
        nodesUpdated: 0,
        relationshipsCreated: 0,
        processingTimeMs: Date.now() - startTime
      };
    }

    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const semanticProcessingJobService = {
  processSemanticDocument,
  processSemanticBatch
};

export default semanticProcessingJobService;
