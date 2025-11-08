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

    // Removed noisy logging (was flooding console with polling requests)
    // logger.info('Fetching assessments list', { userId, isGuest });

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
          ub.batch_metadata,
          ub.total_files,
          ub.processed_files,
          ub.successful_files,
          ub.failed_files,
          ub.status as batch_status
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
          ub.batch_metadata,
          ub.total_files,
          ub.processed_files,
          ub.successful_files,
          ub.failed_files,
          ub.status as batch_status
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
      data: result.rows.map(row => {
        const totalFiles = parseInt(row.total_files) || 0;
        const processedFiles = parseInt(row.processed_files) || 0;
        const progress = totalFiles > 0 ? Math.round((processedFiles / totalFiles) * 100) : 0;
        
        return {
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
          totalDocuments: totalFiles,
          gapsCount: row.gaps_count || 0,
          createdAt: row.created_at,
          status: row.status || 'complete',
          progress: progress,
          processedFiles: processedFiles,
          successfulFiles: parseInt(row.successful_files) || 0,
          failedFiles: parseInt(row.failed_files) || 0
        };
      })
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
    
    // For guest users, use the system guest user (not string 'guest')
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
// POST /api/assessment/batch/:batchId/complete
// Manually trigger assessment generation for a completed batch
// ============================================================================

router.post('/batch/:batchId/complete', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { batchId } = req.params;
    const userId = (req as any).user.id;

    logger.info('Manually completing assessment for batch', {
      batchId,
      userId
    });

    // Get batch info
    const batchQuery = `
      SELECT ub.id, ub.project_id, ub.uploaded_by, ub.status as batch_status,
             ub.batch_metadata, ub.total_files, ub.successful_files, ub.failed_files
      FROM upload_batches ub
      WHERE ub.id = $1
    `;
    
    const batchResult = await pool.query(batchQuery, [batchId]);
    
    if (batchResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
    }

    const batch = batchResult.rows[0];
    
    // Check if batch is complete
    if (batch.batch_status !== 'complete') {
      return res.status(400).json({
        success: false,
        error: `Batch is not complete (status: ${batch.batch_status}). Cannot generate assessment yet.`
      });
    }

    // Check if assessment already exists and has complete data
    const existingAssessmentQuery = `
      SELECT id, status, gaps, assessment_data FROM assessments WHERE batch_id = $1
    `;
    const existingAssessment = await pool.query(existingAssessmentQuery, [batchId]);
    
    if (existingAssessment.rows.length > 0 && existingAssessment.rows[0].status === 'complete') {
      // Check if assessment has actual data (not just empty objects)
      const hasData = existingAssessment.rows[0].gaps && 
                      existingAssessment.rows[0].gaps.length > 0 &&
                      existingAssessment.rows[0].assessment_data &&
                      Object.keys(existingAssessment.rows[0].assessment_data).length > 0;
      
      if (hasData) {
        return res.json({
          success: true,
          message: 'Assessment already completed with full data',
          assessmentId: existingAssessment.rows[0].id
        });
      } else {
        logger.info('Assessment is marked complete but has no data, regenerating', {
          assessmentId: existingAssessment.rows[0].id,
          batchId
        });
      }
    }

    const projectId = batch.project_id;
    const uploadedBy = batch.uploaded_by;
    const industryVertical = batch.batch_metadata?.industryVertical || 'technology';

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

    const assessmentUpdateResult = await pool.query(assessmentUpdateQuery, [
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

    if (assessmentUpdateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Assessment record not found for this batch'
      });
    }

    logger.info('Assessment completed successfully', {
      assessmentId: assessmentUpdateResult.rows[0].id,
      batchId,
      maturityLevel: assessmentResult.portfolio_summary.maturity_level,
      avgScore: assessmentResult.portfolio_summary.avg_quality_score
    });

    res.json({
      success: true,
      data: {
        assessmentId: assessmentUpdateResult.rows[0].id,
        maturityLevel: assessmentResult.portfolio_summary.maturity_level,
        maturityLabel: assessmentResult.portfolio_summary.maturity_label,
        avgQualityScore: assessmentResult.portfolio_summary.avg_quality_score,
        gapsCount
      }
    });

  } catch (error: any) {
    logger.error('Failed to complete assessment for batch', {
      error: error.message,
      batchId: req.params.batchId,
      stack: error.stack
    });
    next(error);
  }
});

// ============================================================================
// GET /api/assessment/batch/:batchId
// Get assessment by batch ID
// ============================================================================

router.get('/batch/:batchId', optionalAuthForView, async (req: Request, res: Response, next: NextFunction) => {
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

    // Transform data to match frontend expectations
    const transformedData = {
      ...assessment,
      // Map documentsByType from breakdown data
      documentsByType: assessment.assessment_data?.breakdown?.by_document_type 
        ? Object.entries(assessment.assessment_data.breakdown.by_document_type).map(([type, data]: [string, any]) => ({
            type,
            count: data.count || 0,
            avgScore: data.avg_score || 0,
            status: data.grade || 'Unknown'
          }))
        : [],
      // Use existing fields with camelCase
      overallMaturityLevel: assessment.overall_maturity_level,
      overallMaturityLabel: assessment.maturity_label,
      averageQualityScore: parseFloat(assessment.avg_quality_score),
      totalDocuments: assessment.total_documents,
      // Rename roi_metrics to roiMetrics for frontend
      roiMetrics: assessment.roi_metrics
    };

    res.json({
      success: true,
      data: transformedData
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

/**
 * POST /api/assessment/batch/:batchId/add-documents
 * Add more documents to an existing assessment batch
 * This allows users to enhance their assessment with additional documents
 */
router.post('/batch/:batchId/add-documents', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { batchId } = req.params;
    const userId = (req as any).user?.id;

    // Verify batch exists and belongs to user (or is guest-created)
    const batchResult = await pool.query(
      `SELECT ub.*, p.created_by as project_owner
       FROM upload_batches ub
       JOIN projects p ON ub.project_id = p.id
       WHERE ub.id = $1`,
      [batchId]
    );

    if (batchResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
    }

    const batch = batchResult.rows[0];
    
    // Check permissions
    const isGuestBatch = batch.project_owner === (await pool.query(
      "SELECT id FROM users WHERE email = 'onboarding-guest@system.local'"
    )).rows[0]?.id;
    
    if (!isGuestBatch && batch.uploaded_by !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this batch'
      });
    }

    res.json({
      success: true,
      data: {
        batchId: batch.id,
        projectId: batch.project_id,
        status: batch.status,
        currentDocuments: batch.successful_files,
        message: 'Ready to accept additional documents. Use the document upload endpoint with this batchId.'
      }
    });

  } catch (error: any) {
    logger.error('Failed to prepare batch for additional documents', {
      error: error.message,
      batchId: req.params.batchId
    });
    next(error);
  }
});

/**
 * POST /api/assessment/batch/:batchId/regenerate
 * Regenerate assessment after adding new documents
 * This recalculates all metrics with the updated document set
 */
router.post('/batch/:batchId/regenerate', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { batchId } = req.params;
    const userId = (req as any).user?.id;

    logger.info('Regenerating assessment for batch', { batchId, userId });

    // Verify batch exists
    const batchResult = await pool.query(
      'SELECT * FROM upload_batches WHERE id = $1',
      [batchId]
    );

    if (batchResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
    }

    const batch = batchResult.rows[0];

    // Delete existing assessment to force regeneration
    await pool.query(
      'DELETE FROM assessments WHERE batch_id = $1',
      [batchId]
    );

    logger.info('Deleted old assessment, generating new one', { batchId });

    // Generate fresh assessment with all documents
    const assessment = await portfolioAssessmentService.generateAssessment(
      batchId,
      batch.project_id,
      userId
    );

    logger.info('Assessment regenerated successfully', { 
      batchId, 
      assessmentId: assessment.id,
      totalDocuments: assessment.total_documents 
    });

    res.json({
      success: true,
      data: assessment,
      message: `Assessment regenerated with ${assessment.total_documents} documents`
    });

  } catch (error: any) {
    logger.error('Failed to regenerate assessment', {
      error: error.message,
      stack: error.stack,
      batchId: req.params.batchId
    });
    next(error);
  }
});

export default router;

