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
// Optional authentication middleware - uses system guest user if no token
const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Try to authenticate, but don't fail if no token
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      // Has token - authenticate normally
      return authenticate(req, res, next);
    } else {
      // No token - use dedicated guest/onboarding system user
      const { pool } = require('../database/connection');
      
      // Get or create the "onboarding-guest" system user
      let guestUser = await pool.query(
        `SELECT id, email FROM users WHERE email = $1`,
        ['onboarding-guest@system.local']
      );
      
      if (guestUser.rows.length === 0) {
        // Create system guest user on first use
        const { v4: uuidv4 } = require('uuid');
        const bcrypt = require('bcryptjs');
        const guestId = uuidv4();
        
        await pool.query(
          `INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
           ON CONFLICT (email) DO NOTHING
           RETURNING id, email`,
          [
            guestId,
            'onboarding-guest@system.local',
            await bcrypt.hash('no-password-login-disabled', 10),
            'Onboarding Guest User (System)',
            'user'
          ]
        );
        
        guestUser = await pool.query(
          `SELECT id, email FROM users WHERE email = $1`,
          ['onboarding-guest@system.local']
        );
        
        logger.info('Created system guest user for onboarding', { userId: guestUser.rows[0].id });
      }
      
      (req as any).user = {
        id: guestUser.rows[0].id,
        email: guestUser.rows[0].email,
        role: 'guest',
        isGuest: true
      };
      
      logger.info('Using guest session for onboarding', { userId: guestUser.rows[0].id });
      next();
    }
  } catch (error) {
    logger.error('Optional auth failed', { error: (error as Error).message });
    next(error);
  }
};

router.post(
  '/upload',
  optionalAuth, // Allow public access for potential clients
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
      const isGuest = (req as any).user.isGuest;
      
      // For onboarding assessments (potential clients), auto-create project if needed
      let actualProjectId = projectId;
      
      // Store guest email if provided for follow-up
      const guestEmail = req.body.email || req.body.contactEmail;
      
      if (!actualProjectId && assessmentName) {
        // Create onboarding project automatically
        const { v4: uuidv4 } = require('uuid');
        const { pool } = require('../database/connection');
        
        const onboardingProjectId = uuidv4();
        const projectQuery = `
          INSERT INTO projects (
            id, name, description, framework, priority, owner_id, created_by, 
            start_date, end_date, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
          RETURNING id
        `;
        
        await pool.query(projectQuery, [
          onboardingProjectId,
          assessmentName,
          `Client onboarding: ${clientName || 'Prospective client'} - ${organizationName || ''}`.trim(),
          'PMBOK',
          'medium',
          userId,
          userId,
          new Date().toISOString().split('T')[0],
          new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        ]);
        
        actualProjectId = onboardingProjectId;
        logger.info('Auto-created onboarding project', { 
          projectId: onboardingProjectId, 
          assessmentName,
          clientName 
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

      // Verify user has access to project (skip for guests and auto-created projects)
      if (projectId && !isGuest) {
        const hasAccess = await verifyProjectAccess(req.user.id, projectId);
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
          isOnboardingAssessment: !projectId,  // Flag for potential client assessments
          isGuestUpload: isGuest,  // Flag for public/guest uploads
          guestEmail: guestEmail || null,  // Capture guest email for follow-up
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
      const hasAccess = await verifyProjectAccess(req.user.id, status.projectId);
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
      const hasAccess = await verifyProjectAccess(req.user.id, projectId);
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
      const hasAccess = await verifyProjectAccess(req.user.id, status.projectId);
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

/**
 * Verify user has access to project
 */
async function verifyProjectAccess(userId: string, projectId: string): Promise<boolean> {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Secure SSL configuration: validate certificates by default
    ssl: process.env.DB_SSL === 'true' 
      ? { rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0' } // Default to true (secure)
      : false
  });

  try {
    const query = `
      SELECT 1 FROM projects
      WHERE id = $1 AND (
        created_by = $2 OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_id = $1 AND user_id = $2
        )
      )
    `;

    const result = await pool.query(query, [projectId, userId]);
    return result.rows.length > 0;

  } catch (error: any) {
    logger.error('Project access verification failed', {
      userId,
      projectId,
      error: error.message
    });
    return false;
  } finally {
    await pool.end();
  }
}

/**
 * Cancel upload batch
 */
async function cancelUploadBatch(batchId: string): Promise<void> {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Secure SSL configuration: validate certificates by default
    ssl: process.env.DB_SSL === 'true' 
      ? { rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0' } // Default to true (secure)
      : false
  });

  try {
    await pool.query(`
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
    await pool.end();
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
  optionalAuth,
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
