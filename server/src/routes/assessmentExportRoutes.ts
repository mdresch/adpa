/**
 * Assessment Export Routes
 * 
 * API endpoints for exporting assessment reports in various formats
 */

import express, { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { authenticateToken as authenticate } from '../middleware/auth';
import { pool } from '../database/connection';
import * as assessmentReportService from '../services/assessmentReportService';
import { portfolioAssessmentService } from '../services/portfolioAssessmentService';

const router = express.Router();

// Optional auth middleware for guest access
const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      return authenticate(req, res, next);
    }
    
    // For guest users, find or create system guest user
    const guestEmail = 'onboarding-guest@system.local';
    const guestResult = await pool.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [guestEmail]
    );
    
    if (guestResult.rows.length === 0) {
      // Create guest user if doesn't exist
      const newGuestResult = await pool.query(
        `INSERT INTO users (id, email, name, role, is_active, created_at) 
         VALUES (gen_random_uuid(), $1, 'Guest User', 'guest', true, NOW())
         RETURNING id, email, role`,
        [guestEmail]
      );
      (req as any).user = newGuestResult.rows[0];
    } else {
      (req as any).user = guestResult.rows[0];
    }
    
    (req as any).user.isGuest = true;
    next();
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// GET /api/assessment/list
// Get all assessments for current user (authenticated or guest)
// ============================================================================

router.get('/list', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const isGuest = (req as any).user.isGuest;

    logger.info('Fetching assessments list', { userId, isGuest });

    // For guest users, get assessments from upload_batches (all guest uploads)
    // For authenticated users, get assessments from their projects
    let query: string;
    let params: any[];

    if (isGuest) {
      query = `
        SELECT 
          a.*,
          p.name as project_name,
          ub.uploaded_by,
          ub.batch_metadata
        FROM assessments a
        JOIN projects p ON a.project_id = p.id
        LEFT JOIN upload_batches ub ON a.batch_id = ub.id
        WHERE ub.uploaded_by = $1
        ORDER BY a.created_at DESC
        LIMIT 100
      `;
      params = [userId];
    } else {
      query = `
        SELECT 
          a.*,
          p.name as project_name,
          ub.uploaded_by,
          ub.batch_metadata
        FROM assessments a
        JOIN projects p ON a.project_id = p.id
        LEFT JOIN upload_batches ub ON a.batch_id = ub.id
        WHERE p.created_by = $1
        ORDER BY a.created_at DESC
        LIMIT 100
      `;
      params = [userId];
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        batchId: row.batch_id,
        projectId: row.project_id,
        projectName: row.project_name,
        clientName: row.batch_metadata?.clientName || 'Unknown Client',
        organizationName: row.batch_metadata?.organizationName || row.project_name,
        assessmentPurpose: row.batch_metadata?.assessmentPurpose || 'Assessment',
        overallMaturityLevel: row.overall_maturity_level,
        overallMaturityLabel: row.maturity_label,
        averageQualityScore: parseFloat(row.avg_quality_score),
        totalDocuments: parseInt(row.total_documents),
        gapsCount: row.gaps_count || 0,
        createdAt: row.created_at,
        status: row.status || 'complete'
      }))
    });

  } catch (error: any) {
    logger.error('Failed to fetch assessments list', {
      error: error.message,
      userId: (req as any).user?.id
    });
    next(error);
  }
});

// ============================================================================
// GET /api/assessment/:assessmentId
// Get assessment data
// ============================================================================

// Optional auth for viewing assessments (guests can view their own assessments)
const optionalAuthForView = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      return authenticate(req, res, next);
    }
    // Allow guest access for viewing assessments (will be filtered by batch_id or guest_id)
    (req as any).user = { id: 'guest', role: 'guest', isGuest: true };
    next();
  } catch (error) {
    next(error);
  }
};

router.get('/:assessmentId', optionalAuthForView, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assessmentId } = req.params;
    const userId = (req as any).user.id;

    logger.info('Fetching assessment', {
      assessmentId,
      userId
    });

    // Get assessment from service
    const assessment = await portfolioAssessmentService.getAssessment(assessmentId, userId);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found'
      });
    }

    res.json({
      success: true,
      data: assessment
    });

  } catch (error: any) {
    logger.error('Failed to fetch assessment', {
      error: error.message,
      assessmentId: req.params.assessmentId
    });
    next(error);
  }
});

// ============================================================================
// GET /api/assessment/:assessmentId/export
// Export assessment report
// ============================================================================

router.get('/:assessmentId/export', optionalAuthForView, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assessmentId } = req.params;
    const { format = 'pdf' } = req.query;
    const userId = (req as any).user.id;

    logger.info('Exporting assessment', {
      assessmentId,
      format,
      userId
    });

    // Get assessment data
    const assessment = await portfolioAssessmentService.getAssessment(assessmentId, userId);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found'
      });
    }

    // Export based on format
    switch (format) {
      case 'pdf':
      case 'html': {
        const result = await assessmentReportService.generateAssessmentReport(
          assessment,
          {
            format: format as 'pdf' | 'html',
            includeCharts: true,
            includeRecommendations: true,
            includeBenchmarks: true
          }
        );

        res.setHeader('Content-Type', result.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="assessment-${assessmentId}.${format}"`);
        res.send(result.buffer);
        break;
      }

      case 'csv': {
        const csv = assessmentReportService.exportAssessmentCSV(assessment);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="assessment-${assessmentId}.csv"`);
        res.send(csv);
        break;
      }

      case 'json': {
        const json = assessmentReportService.exportAssessmentJSON(assessment);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="assessment-${assessmentId}.json"`);
        res.send(json);
        break;
      }

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid format. Supported: pdf, html, csv, json'
        });
    }

  } catch (error: any) {
    logger.error('Failed to export assessment', {
      error: error.message,
      assessmentId: req.params.assessmentId,
      format: req.query.format
    });
    next(error);
  }
});

// ============================================================================
// POST /api/assessment/:assessmentId/regenerate
// Regenerate assessment with updated parameters
// ============================================================================

router.post('/:assessmentId/regenerate', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assessmentId } = req.params;
    const { projectId } = req.body;
    const userId = (req as any).user.id;

    logger.info('Regenerating assessment', {
      assessmentId,
      projectId,
      userId
    });

    // Regenerate assessment
    const assessment = await portfolioAssessmentService.generateAssessment(projectId, userId);

    res.json({
      success: true,
      data: assessment
    });

  } catch (error: any) {
    logger.error('Failed to regenerate assessment', {
      error: error.message,
      assessmentId: req.params.assessmentId
    });
    next(error);
  }
});

// ============================================================================
// GET /api/assessment/batch/:batchId
// Get assessment by batch ID
// ============================================================================

router.get('/batch/:batchId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { batchId } = req.params;
    const userId = (req as any).user.id;

    logger.info('Fetching assessment by batch', {
      batchId,
      userId
    });

    // Get assessment by batch ID
    const assessment = await portfolioAssessmentService.getAssessmentByBatchId(batchId, userId);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found for this batch'
      });
    }

    res.json({
      success: true,
      data: assessment
    });

  } catch (error: any) {
    logger.error('Failed to fetch assessment by batch', {
      error: error.message,
      batchId: req.params.batchId
    });
    next(error);
  }
});

// ============================================================================
// POST /api/assessment/project/quick-create
// Quick create project for onboarding (no special permissions needed)
// ============================================================================

router.post('/project/quick-create', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body;
    const userId = (req as any).user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Project name is required'
      });
    }

    logger.info('Quick creating project for onboarding', { name, userId });

    const projectId = require('uuid').v4();
    
    // Create project with minimal fields for onboarding
    const query = `
      INSERT INTO projects (
        id, name, description, framework, priority, 
        owner_id, created_by, start_date, end_date, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `;

    const result = await pool.query(query, [
      projectId,
      name.trim(),
      description || '',
      'PMBOK',  // Default framework for assessments
      'medium', // Default priority
      userId,
      userId,
      new Date().toISOString().split('T')[0], // Today
      new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 90 days from now
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error: any) {
    logger.error('Failed to quick create project', {
      error: error.message
    });
    next(error);
  }
});

export default router;

