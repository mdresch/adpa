/**
 * Document Upload Routes
 * 
 * API endpoints for bulk document upload and batch management
 * Part of Client Onboarding Assessment system
 * 
 * @module documentUploadRoutes
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { logger } from '../utils/logger';
import {
  documentUploadService,
  UploadBatchOptions
} from '../services/documentUploadService';
import { authenticateToken as authenticate } from '../middleware/auth';
import { connectDatabase, getDatabasePool } from '../database/connection';

const router = Router();

// ============================================================================
// MULTER CONFIGURATION
// ============================================================================

// Configure multer for memory storage (files stored in buffer)
const storage = multer.memoryStorage();

// File filter: only accept supported formats
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const allowedMimes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'text/plain',
    'text/markdown',
    'text/html',
    'application/rtf',
    'application/vnd.oasis.opendocument.text' // ODT
  ];

  const allowedExtensions = ['pdf', 'docx', 'txt', 'md', 'markdown', 'html', 'htm', 'rtf', 'odt'];
  const ext = file.originalname.split('.').pop()?.toLowerCase();

  if (allowedMimes.includes(file.mimetype) || (ext && allowedExtensions.includes(ext))) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype || ext}. Allowed: PDF, DOCX, TXT, MD, HTML, RTF`));
  }
};

// Configure multer with limits and file filter
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 100 // Max 100 files per upload
  }
});

// ============================================================================
// UPLOAD ENDPOINTS
// ============================================================================

/**
 * POST /api/onboarding/upload
 * Upload bulk documents for assessment
 * 
 * Body: FormData with files[] array
 * Headers: Authorization: Bearer JWT
 * 
 * Response: {
 *   success: true,
 *   data: {
 *     batch_id: UUID,
 *     total_files: number,
 *     status: 'processing',
 *     created_at: timestamp
 *   }
 * }
 */

/**
 * Authentication is now required for all document uploads.
 * Users must register and authenticate before accessing onboarding features.
 */

router.post(
  '/upload',
  authenticate, // Authentication required - users must register first
  upload.array('files', 100), // Accept up to 100 files
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILES',
            message: 'No files provided. Please upload at least one document.'
          }
        });
      }

      const {
        projectId,
        assessmentName,
        clientName,
        organizationName,
        assessmentPurpose,
        industryVertical
      } = req.body;

      const userId = (req as any).user.id;

      // For onboarding assessments, auto-create project if needed
      let actualProjectId = projectId;

      if (!actualProjectId && assessmentName) {
        // Create onboarding project automatically
        const { v4: uuidv4 } = require('uuid');
        const { pool } = require('../database/connection');

        // Try to fetch the user's company_id so the onboarding project
        // is visible under standard company-based project filters
        let userCompanyId: string | null = null;
        try {
          const userResult = await pool.query(
            'SELECT company_id FROM users WHERE id = $1',
            [userId]
          );
          if (userResult.rows.length > 0) {
            userCompanyId = userResult.rows[0].company_id;
          }
        } catch (err: any) {
          // If company_id column doesn't exist yet, log and continue without it
          if (err.message?.includes('column "company_id"') || err.code === '42703') {
            logger.warn('company_id column not found on users table when auto-creating onboarding project, creating project without company_id');
          } else {
            throw err;
          }
        }

        const onboardingProjectId = uuidv4();

        // Prefer inserting with company_id when the column exists; fall back
        // to the legacy shape if the projects table doesn't yet have company_id
        let projectQuery = `
          INSERT INTO projects (
            id, name, description, framework, priority, owner_id, created_by, 
            start_date, end_date, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
          RETURNING id
        `;

        const baseParams = [
          onboardingProjectId,
          assessmentName,
          `Client onboarding: ${clientName || 'Prospective client'} - ${organizationName || ''}`.trim(),
          'PMBOK',
          'medium',
          userId,
          userId,
          new Date().toISOString().split('T')[0],
          new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        ];

        if (userCompanyId) {
          try {
            projectQuery = `
              INSERT INTO projects (
                id, name, description, framework, priority, owner_id, created_by, 
                start_date, end_date, company_id, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
              RETURNING id
            `;

            await pool.query(projectQuery, [
              ...baseParams,
              userCompanyId
            ]);
          } catch (err: any) {
            // If company_id doesn't exist on projects table yet, fall back to legacy insert
            if (err.message?.includes('column "company_id"') || err.code === '42703') {
              logger.warn('company_id column not found on projects table when auto-creating onboarding project, falling back without company_id');
              await pool.query(projectQuery, baseParams);
            } else {
              throw err;
            }
          }
        } else {
          // No company context available, use legacy insert
          await pool.query(projectQuery, baseParams);
        }

        actualProjectId = onboardingProjectId;
        logger.info('Auto-created onboarding project', {
          projectId: onboardingProjectId,
          assessmentName,
          clientName,
          userCompanyId
        });
      }

      if (!actualProjectId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PROJECT_ID',
            message: 'Project ID is required'
          }
        });
      }

      // Verify user has access to project (skip for auto-created projects)
      if (projectId) {
        const hasAccess = await verifyProjectAccess(req.user, projectId);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have access to this project'
            }
          });
        }
      }

      logger.info('Bulk upload initiated', {
        userId: req.user.id,
        projectId: actualProjectId,
        assessmentName,
        clientName,
        fileCount: files.length,
        industryVertical
      });

      // Create upload batch with client metadata
      const options: UploadBatchOptions = {
        projectId: actualProjectId,
        uploadedBy: req.user.id,
        files,
        industryVertical,
        metadata: {
          uploadMethod: 'web',
          userAgent: req.headers['user-agent'],
          clientIP: req.ip,
          // Client onboarding metadata
          assessmentName,
          clientName,
          organizationName: organizationName || clientName,
          assessmentPurpose: assessmentPurpose || 'Portfolio Maturity Assessment',
          isOnboardingAssessment: !projectId,  // Flag for onboarding assessments
          uploadDate: new Date().toISOString()
        }
      };

      const result = await documentUploadService.createUploadBatch(options);

      res.json({
        success: true,
        data: {
          batch_id: result.batchId,
          total_files: result.totalFiles,
          status: result.status,
          created_at: result.createdAt
        }
      });

    } catch (error: any) {
      logger.error('Upload endpoint error', {
        error: error.message,
        stack: error.stack
      });

      next(error);
    }
  }
);

/**
 * GET /api/onboarding/upload/:batchId
 * Get upload batch status and progress
 * 
 * Response: {
 *   success: true,
 *   data: {
 *     batch_id: UUID,
 *     project_id: UUID,
 *     total_files: number,
 *     processed_files: number,
 *     successful_files: number,
 *     failed_files: number,
 *     status: 'processing' | 'completed' | 'failed',
 *     files: [...],
 *     created_at: timestamp,
 *     completed_at?: timestamp
 *   }
 * }
 */
router.get(
  '/upload/:batchId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { batchId } = req.params;

      const status = await documentUploadService.getBatchStatus(batchId);

      if (!status) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'BATCH_NOT_FOUND',
            message: `Upload batch ${batchId} not found`
          }
        });
      }

      // Verify user has access
      const hasAccess = await verifyProjectAccess(req.user, status.projectId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this batch'
          }
        });
      }

      res.json({
        success: true,
        data: status
      });

    } catch (error: any) {
      logger.error('Get batch status error', {
        batchId: req.params.batchId,
        error: error.message
      });

      next(error);
    }
  }
);

/**
 * GET /api/onboarding/documents/:projectId
 * Get all uploaded documents for a project
 * 
 * Response: {
 *   success: true,
 *   data: {
 *     documents: [...]
 *   }
 * }
 */
router.get(
  '/documents/:projectId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;

      // Verify access
      const hasAccess = await verifyProjectAccess(req.user, projectId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this project'
          }
        });
      }

      const documents = await documentUploadService.getUploadedDocuments(projectId);

      res.json({
        success: true,
        data: {
          documents,
          total: documents.length
        }
      });

    } catch (error: any) {
      logger.error('Get uploaded documents error', {
        projectId: req.params.projectId,
        error: error.message
      });

      next(error);
    }
  }
);

/**
 * DELETE /api/onboarding/upload/:batchId
 * Cancel an ongoing upload batch (mark as cancelled, stop processing)
 * 
 * Response: {
 *   success: true,
 *   message: 'Upload batch cancelled'
 * }
 */
router.delete(
  '/upload/:batchId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { batchId } = req.params;

      const status = await documentUploadService.getBatchStatus(batchId);

      if (!status) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'BATCH_NOT_FOUND',
            message: `Upload batch ${batchId} not found`
          }
        });
      }

      // Verify user has access
      const hasAccess = await verifyProjectAccess(req.user, status.projectId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this batch'
          }
        });
      }

      if (status.status !== 'processing') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATE',
            message: 'Can only cancel batches in processing state'
          }
        });
      }

      // Cancel batch
      await cancelUploadBatch(batchId);

      res.json({
        success: true,
        message: 'Upload batch cancelled successfully'
      });

    } catch (error: any) {
      logger.error('Cancel batch error', {
        batchId: req.params.batchId,
        error: error.message
      });

      next(error);
    }
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Import the centralized project access verification function
import { verifyProjectAccess } from '../lib/projectAccess'

/**
 * Cancel upload batch
 */
async function cancelUploadBatch(batchId: string): Promise<void> {
  await connectDatabase();
  const sharedPool = getDatabasePool();
  const client = await sharedPool.connect();

  try {
    await client.query(`
      UPDATE upload_batches
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1
    `, [batchId]);

    // Remove pending jobs from queue
    const { documentUploadQueue } = require('../services/documentUploadService');
    const jobs = await documentUploadQueue.getJobs(['waiting', 'delayed']);

    for (const job of jobs) {
      if (job.data.batchId === batchId) {
        await job.remove();
      }
    }

  } finally {
    client.release();
  }
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Handle multer errors
 */
router.use((error: any, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    let message = 'File upload error';
    let code = 'UPLOAD_ERROR';

    if (error.code === 'LIMIT_FILE_SIZE') {
      message = 'File size exceeds 10MB limit';
      code = 'FILE_TOO_LARGE';
    } else if (error.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files. Maximum 100 files allowed per upload';
      code = 'TOO_MANY_FILES';
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected file field';
      code = 'INVALID_FIELD';
    }

    return res.status(400).json({
      success: false,
      error: { code, message }
    });
  }

  // Check for unsupported file type error
  if (error.message && error.message.includes('Unsupported file type')) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'UNSUPPORTED_FILE_TYPE',
        message: error.message
      }
    });
  }

  next(error);
});

// ============================================================================
// ADD DOCUMENTS TO EXISTING BATCH
// ============================================================================

/**
 * POST /api/onboarding/batch/:batchId/add-documents
 * Add more documents to an existing assessment batch
 * Allows customers to enhance their assessment with additional documents
 */
router.post(
  '/batch/:batchId/add-documents',
  authenticate,
  upload.array('files', 100),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { batchId } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILES',
            message: 'No files provided. Please upload at least one document.'
          }
        });
      }

      logger.info('Adding documents to existing batch', {
        batchId,
        fileCount: files.length,
        userId: (req as any).user.id
      });

      // Add documents to existing batch
      const result = await documentUploadService.addDocumentsToExistingBatch(
        batchId,
        files
      );

      res.status(200).json({
        success: true,
        data: result,
        message: `${files.length} document(s) added successfully. Processing will begin shortly.`
      });

    } catch (error: any) {
      logger.error('Failed to add documents to batch', {
        error: error.message,
        batchId: req.params.batchId
      });
      next(error);
    }
  }
);

// ============================================================================
// EXPORTS
// ============================================================================

export default router;
