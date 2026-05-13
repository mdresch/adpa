/**
 * Semantic Processing Routes
 * 
 * API endpoints for semantic processing status retrieval and management.
 * Provides visibility into the async processing pipeline lifecycle.
 * 
 * @module semanticProcessingRoutes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken as authenticate } from '../middleware/auth';
import { semanticProcessingService } from '../services/semanticProcessingService';
import { semanticProcessingQueue } from '../services/queueService';
import { logger } from '../utils/logger';
import { pool } from '../database/connection';
import { userHasProjectAccess } from '../lib/project-access';
import type { AuthenticatedUser } from '../../../lib/auth-utils';

const router = Router();

function userFromReq(req: Request): AuthenticatedUser | null {
  const u = (req as any).user;
  if (!u?.id) return null;
  return {
    id: u.id,
    email: u.email || '',
    role: String(u.role || ''),
    permissions: u.permissions ?? {},
  };
}

async function requireSemanticProjectAccess(
  req: Request,
  res: Response,
  projectId: string
): Promise<boolean> {
  const user = userFromReq(req);
  if (!user) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return false;
  }
  try {
    const ok = await userHasProjectAccess(pool, user, projectId);
    if (!ok) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return false;
    }
    return true;
  } catch (error: unknown) {
    logger.error('Semantic route: project access check failed', {
      projectId,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ success: false, error: 'Access check failed' });
    return false;
  }
}

// ============================================================================
// DOCUMENT STATUS ENDPOINTS
// ============================================================================

/**
 * GET /api/semantic-processing/document/:documentId
 * Get semantic processing status for a single document
 */
router.get(
  '/document/:documentId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.params;

      const status = await semanticProcessingService.getDocumentStatus(documentId);

      if (!status) {
        return res.status(404).json({
          success: false,
          error: 'No semantic processing record found for this document'
        });
      }

      if (!(await requireSemanticProjectAccess(req, res, status.projectId))) {
        return;
      }

      return res.json({
        success: true,
        data: status
      });

    } catch (error: unknown) {
      logger.error('Failed to get document semantic status', {
        documentId: req.params.documentId,
        error: error instanceof Error ? error.message : String(error)
      });
      next(error);
    }
  }
);

// ============================================================================
// BATCH STATUS ENDPOINTS
// ============================================================================

/**
 * GET /api/semantic-processing/batch/:batchId
 * Get semantic processing status for all documents in a batch
 */
router.get(
  '/batch/:batchId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { batchId } = req.params;

      const status = await semanticProcessingService.getBatchStatus(batchId);

      if (!status) {
        return res.status(404).json({
          success: false,
          error: 'No semantic processing record found for this batch'
        });
      }

      if (!(await requireSemanticProjectAccess(req, res, status.projectId))) {
        return;
      }

      return res.json({
        success: true,
        data: status
      });

    } catch (error: unknown) {
      logger.error('Failed to get batch semantic status', {
        batchId: req.params.batchId,
        error: error instanceof Error ? error.message : String(error)
      });
      next(error);
    }
  }
);

/**
 * GET /api/semantic-processing/batch/:batchId/summary
 * Get a lightweight summary of batch processing status (for polling)
 */
router.get(
  '/batch/:batchId/summary',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { batchId } = req.params;

      const status = await semanticProcessingService.getBatchStatus(batchId);

      if (!status) {
        return res.status(404).json({
          success: false,
          error: 'No semantic processing record found for this batch'
        });
      }

      if (!(await requireSemanticProjectAccess(req, res, status.projectId))) {
        return;
      }

      // Return lightweight summary without full document details
      return res.json({
        success: true,
        data: {
          batchId: status.batchId,
          projectId: status.projectId,
          overallState: status.overallState,
          totalDocuments: status.totalDocuments,
          documentsConverted: status.documentsConverted,
          documentsExtracted: status.documentsExtracted,
          documentsSynced: status.documentsSynced,
          documentsFailed: status.documentsFailed,
          totalEntitiesExtracted: status.totalEntitiesExtracted,
          totalGkgNodesCreated: status.totalGkgNodesCreated,
          startedAt: status.startedAt,
          completedAt: status.completedAt,
          progress: status.totalDocuments > 0
            ? Math.round((status.documentsSynced + status.documentsFailed) / status.totalDocuments * 100)
            : 0
        }
      });

    } catch (error: unknown) {
      logger.error('Failed to get batch semantic summary', {
        batchId: req.params.batchId,
        error: error instanceof Error ? error.message : String(error)
      });
      next(error);
    }
  }
);

// ============================================================================
// PROJECT STATUS ENDPOINTS
// ============================================================================

/**
 * GET /api/semantic-processing/project/:projectId
 * Get semantic processing status for all documents in a project
 */
router.get(
  '/project/:projectId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;

      if (!(await requireSemanticProjectAccess(req, res, projectId))) {
        return;
      }

      const statuses = await semanticProcessingService.getProjectStatus(projectId);

      return res.json({
        success: true,
        data: {
          projectId,
          totalDocuments: statuses.length,
          documents: statuses
        }
      });

    } catch (error: unknown) {
      logger.error('Failed to get project semantic status', {
        projectId: req.params.projectId,
        error: error instanceof Error ? error.message : String(error)
      });
      next(error);
    }
  }
);

// ============================================================================
// RETRY ENDPOINTS
// ============================================================================

/**
 * POST /api/semantic-processing/document/:documentId/retry
 * Retry failed semantic processing for a document
 */
router.post(
  '/document/:documentId/retry',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.params;
      const userId = (req as any).user?.id || 'system';

      logger.info('Initiating semantic processing retry', { documentId, userId });

      // Get current status to check if retry is allowed
      const currentStatus = await semanticProcessingService.getDocumentStatus(documentId);

      if (!currentStatus) {
        return res.status(404).json({
          success: false,
          error: 'No semantic processing record found for this document'
        });
      }

      if (!(await requireSemanticProjectAccess(req, res, currentStatus.projectId))) {
        return;
      }

      if (currentStatus.state !== 'failed') {
        return res.status(400).json({
          success: false,
          error: `Cannot retry document in state: ${currentStatus.state}. Only failed documents can be retried.`
        });
      }

      if (currentStatus.retryCount >= currentStatus.maxRetries) {
        return res.status(400).json({
          success: false,
          error: `Maximum retries (${currentStatus.maxRetries}) exceeded. Manual intervention required.`
        });
      }

      // Initiate retry
      const newStatus = await semanticProcessingService.retry(documentId);

      // Enqueue processing job
      if (newStatus && newStatus.state === 'queued_extraction') {
        await semanticProcessingQueue.add('semantic-process-document', {
          documentId,
          projectId: currentStatus.projectId,
          batchId: currentStatus.batchId,
          userId,
          skipExtraction: false,
          skipGkgSync: false
        }, {
          jobId: `semantic-retry-${documentId}-${Date.now()}`,
          priority: 3 // Higher priority for retries
        });
      } else if (newStatus && newStatus.state === 'queued_gkg_sync') {
        await semanticProcessingQueue.add('semantic-process-document', {
          documentId,
          projectId: currentStatus.projectId,
          batchId: currentStatus.batchId,
          userId,
          skipExtraction: true,
          skipGkgSync: false
        }, {
          jobId: `semantic-retry-gkg-${documentId}-${Date.now()}`,
          priority: 3
        });
      }

      return res.json({
        success: true,
        data: newStatus,
        message: `Retry initiated. Attempt ${(newStatus?.retryCount || 0)} of ${currentStatus.maxRetries}`
      });

    } catch (error: unknown) {
      logger.error('Failed to retry semantic processing', {
        documentId: req.params.documentId,
        error: error instanceof Error ? error.message : String(error)
      });
      next(error);
    }
  }
);

/**
 * POST /api/semantic-processing/batch/:batchId/retry-failed
 * Retry all failed documents in a batch
 */
router.post(
  '/batch/:batchId/retry-failed',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { batchId } = req.params;
      const userId = (req as any).user?.id || 'system';

      logger.info('Initiating batch retry for failed documents', { batchId, userId });

      // Get batch status
      const batchStatus = await semanticProcessingService.getBatchStatus(batchId);

      if (!batchStatus) {
        return res.status(404).json({
          success: false,
          error: 'No semantic processing record found for this batch'
        });
      }

      if (!(await requireSemanticProjectAccess(req, res, batchStatus.projectId))) {
        return;
      }

      // Find failed documents that can be retried
      const failedDocs = batchStatus.documents.filter(
        doc => doc.state === 'failed' && doc.retryCount < doc.maxRetries
      );

      if (failedDocs.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No failed documents eligible for retry in this batch'
        });
      }

      // Retry each failed document
      const results: Array<{ documentId: string; success: boolean; error?: string }> = [];

      for (const doc of failedDocs) {
        try {
          await semanticProcessingService.retry(doc.documentId);
          
          await semanticProcessingQueue.add('semantic-process-document', {
            documentId: doc.documentId,
            projectId: doc.projectId,
            batchId: doc.batchId,
            userId,
            skipExtraction: doc.extractionCompletedAt !== null,
            skipGkgSync: false
          }, {
            jobId: `semantic-retry-${doc.documentId}-${Date.now()}`,
            priority: 3
          });

          results.push({ documentId: doc.documentId, success: true });
        } catch (error) {
          results.push({
            documentId: doc.documentId,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      return res.json({
        success: true,
        data: {
          totalRetried: results.length,
          successful,
          failed,
          results
        },
        message: `Retry initiated for ${successful} documents. ${failed} failed to queue.`
      });

    } catch (error: unknown) {
      logger.error('Failed to retry batch documents', {
        batchId: req.params.batchId,
        error: error instanceof Error ? error.message : String(error)
      });
      next(error);
    }
  }
);

// ============================================================================
// RETRYABLE DOCUMENTS ENDPOINT
// ============================================================================

/**
 * GET /api/semantic-processing/retryable
 * Get all documents eligible for retry (failed with retry count < max)
 */
router.get(
  '/retryable',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.query as { projectId?: string };

      if (!projectId || typeof projectId !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'projectId query parameter is required',
        });
      }

      if (!(await requireSemanticProjectAccess(req, res, projectId))) {
        return;
      }

      const documents = await semanticProcessingService.getRetryableDocuments(projectId);

      return res.json({
        success: true,
        data: {
          totalRetryable: documents.length,
          documents
        }
      });

    } catch (error: unknown) {
      logger.error('Failed to get retryable documents', {
        error: error instanceof Error ? error.message : String(error)
      });
      next(error);
    }
  }
);

export default router;
