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

/**
 * Authentication is now required for all assessment routes.
 * Users must register and authenticate before accessing assessments.
 */

// ============================================================================
// GET /api/assessment/list
// Get all assessments for current user (authenticated or guest)
// ============================================================================

router.get('/list', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;

    // Removed noisy logging (was flooding console with polling requests)
    // logger.info('Fetching assessments list', { userId });
    
    // Get assessments for authenticated user
    const query = `
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
      WHERE p.owner_id = $1 OR p.created_by = $1 OR ub.uploaded_by = $1
      ORDER BY a.created_at DESC
      LIMIT 100
    `;
    const params = [userId];

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
// GET /api/assessment/batch/:batchId
// Get assessment by batch ID
// NOTE: This route MUST come before /:assessmentId to avoid route conflicts
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

    // Parse assessment_data if it's a string (JSONB columns can sometimes be returned as strings)
    let assessmentData: any = null;
    if (assessment.assessment_data) {
      if (typeof assessment.assessment_data === 'string') {
        try {
          assessmentData = JSON.parse(assessment.assessment_data);
        } catch (parseError) {
          logger.warn('Failed to parse assessment_data JSON', { batchId, error: parseError });
          assessmentData = null;
        }
      } else {
        assessmentData = assessment.assessment_data;
      }
    }

    // Extract gaps and recommendations from assessment_data
    const gapAnalysis = assessmentData?.gap_analysis || {};
    let allGaps = gapAnalysis.all_gaps || [];
    let allRecommendations = gapAnalysis.all_recommendations || [];

    logger.info('Extracting gaps and recommendations', {
      batchId,
      hasGapAnalysis: !!gapAnalysis,
      allGapsCount: allGaps.length,
      allRecommendationsCount: allRecommendations.length,
      hasCriticalGaps: !!(gapAnalysis.critical_gaps?.length),
      hasHighGaps: !!(gapAnalysis.high_priority_gaps?.length),
      hasMediumGaps: !!(gapAnalysis.medium_priority_gaps?.length)
    });

    // Fallback: If all_gaps is not available, construct from existing gap structure
    if (allGaps.length === 0 && gapAnalysis) {
      allGaps = [
        ...(gapAnalysis.critical_gaps || []).map((g: any) => ({ ...g, severity: g.severity || 'critical' })),
        ...(gapAnalysis.high_priority_gaps || []).map((g: any) => ({ ...g, severity: g.severity || 'high' })),
        ...(gapAnalysis.medium_priority_gaps || []).map((g: any) => ({ ...g, severity: g.severity || 'medium' }))
      ];
      logger.info('Constructed gaps from existing structure', { gapsCount: allGaps.length });
    }

    // Fallback: If gaps column exists and has data, use it
    if (allGaps.length === 0 && assessment.gaps) {
      let gapsData = assessment.gaps;
      if (typeof gapsData === 'string') {
        try {
          gapsData = JSON.parse(gapsData);
        } catch (e) {
          gapsData = [];
        }
      }
      if (Array.isArray(gapsData) && gapsData.length > 0) {
        allGaps = gapsData;
      }
    }

    // If still no gaps, try to extract from quality audits directly
    // First, get project_id from batch if not in assessment
    let projectId = assessment.project_id;
    if (!projectId) {
      const batchQuery = `SELECT project_id FROM upload_batches WHERE id = $1`;
      const batchResult = await pool.query(batchQuery, [batchId]);
      if (batchResult.rows.length > 0) {
        projectId = batchResult.rows[0].project_id;
      }
    }

    if (allGaps.length === 0 && projectId) {
      try {
        logger.info('Extracting gaps/recommendations from quality audits', { projectId, batchId });
        // Fetch quality audits and extract issues/recommendations
        const auditQuery = `
          SELECT 
            qa.issues,
            qa.recommendations,
            qa.overall_score,
            COALESCE(d.title, d.name) as document_title,
            COALESCE(d.framework, d.template_category, 'General') as document_type
          FROM quality_audits qa
          JOIN documents d ON qa.document_id = d.id
          WHERE d.project_id = $1
        `;
        const auditResult = await pool.query(auditQuery, [projectId]);
        logger.info('Fetched quality audits', { 
          auditCount: auditResult.rows.length,
          projectId 
        });
        
        const seenIssues = new Set<string>();
        const seenRecs = new Set<string>();
        
        for (const audit of auditResult.rows) {
          // Parse issues
          let issues = audit.issues;
          if (typeof issues === 'string') {
            try {
              issues = JSON.parse(issues);
            } catch (e) {
              issues = [];
            }
          }
          
          if (issues && Array.isArray(issues)) {
            for (const issue of issues) {
              const issueDesc = issue.description || issue.message || (typeof issue === 'string' ? issue : JSON.stringify(issue));
              const issueKey = `${issue.category || issue.type || 'Unknown'}:${issueDesc}`;
              if (!seenIssues.has(issueKey)) {
                seenIssues.add(issueKey);
                allGaps.push({
                  document_type: audit.document_type || 'Unknown',
                  avg_score: audit.overall_score || 0,
                  severity: issue.severity || issue.priority || (audit.overall_score < 60 ? 'critical' : audit.overall_score < 75 ? 'high' : 'medium'),
                  count: 1,
                  recommendation: issueDesc,
                  estimated_improvement_points: issue.impact || 5,
                  document_title: audit.document_title,
                  issue_category: issue.category || issue.type || 'General'
                });
              }
            }
          }

          // Parse recommendations
          let recommendations = audit.recommendations;
          if (typeof recommendations === 'string') {
            try {
              recommendations = JSON.parse(recommendations);
            } catch (e) {
              recommendations = [];
            }
          }

          if (recommendations && Array.isArray(recommendations)) {
            for (const rec of recommendations) {
              const recKey = typeof rec === 'string' ? rec : JSON.stringify(rec);
              if (!seenRecs.has(recKey)) {
                seenRecs.add(recKey);
                allRecommendations.push(recKey);
              }
            }
          }
        }
        
        logger.info('Extracted gaps and recommendations from quality audits', {
          gapsCount: allGaps.length,
          recommendationsCount: allRecommendations.length,
          batchId
        });
      } catch (extractError: any) {
        logger.warn('Failed to extract gaps/recommendations from quality audits', {
          error: extractError?.message || extractError,
          stack: extractError?.stack,
          batchId,
          projectId
        });
      }
    }
    
    logger.info('Final gaps and recommendations', {
      batchId,
      totalGaps: allGaps.length,
      totalRecommendations: allRecommendations.length
    });

    // Transform data to match frontend expectations
    const transformedData = {
      ...assessment,
      // Map documentsByType from breakdown data
      documentsByType: assessmentData?.breakdown?.by_document_type 
        ? Object.entries(assessmentData.breakdown.by_document_type).map(([type, data]: [string, any]) => ({
            type,
            count: data.count || 0,
            avgScore: data.avg_score || 0,
            status: data.grade || 'Unknown'
          }))
        : [],
      // Use existing fields with camelCase
      overallMaturityLevel: assessment.overall_maturity_level || 0,
      overallMaturityLabel: assessment.maturity_label || 'Initial',
      averageQualityScore: assessment.avg_quality_score ? parseFloat(String(assessment.avg_quality_score)) : 0,
      totalDocuments: assessment.total_documents || 0,
      // Rename roi_metrics to roiMetrics for frontend
      roiMetrics: assessment.roi_metrics || null,
      // Include all gaps (combining document type gaps with individual issues)
      gaps: allGaps.map((gap: any) => {
        // Calculate maturity levels (1-5 scale)
        const calculatedCurrentLevel = Math.max(1, Math.min(5, Math.floor((gap.avg_score || 0) / 20) + 1));
        // Target level should be one level higher, but capped at 5
        const calculatedTargetLevel = Math.max(1, Math.min(5, calculatedCurrentLevel + 1));
        
        return {
          priority: gap.severity || 'medium',
          documentType: gap.document_type || 'Unknown',
          currentLevel: calculatedCurrentLevel,
          targetLevel: calculatedTargetLevel,
          description: gap.recommendation || gap.description || 'No description available',
          recommendation: gap.recommendation,
          estimatedEffort: gap.estimated_improvement_points ? `${gap.estimated_improvement_points} points` : 'Medium',
          estimated_improvement_points: gap.estimated_improvement_points,
          documentTitle: gap.document_title,
          issueCategory: gap.issue_category
        };
      }),
      // Include all recommendations
      recommendations: allRecommendations,
      // Include parsed assessment_data
      assessment_data: assessmentData
    };

    res.json({
      success: true,
      data: transformedData
    });

  } catch (error: any) {
    logger.error('Failed to fetch assessment by batch', {
      error: error.message,
      stack: error.stack,
      batchId: req.params.batchId,
      userId
    });
    
    // Return a more detailed error response
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assessment',
      message: error.message || 'Internal server error',
      batchId: req.params.batchId
    });
  }
});

// ============================================================================
// GET /api/assessment/batch/:batchId/documents
// Get documents by type for a batch
// ============================================================================

router.get('/batch/:batchId/documents', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { batchId } = req.params;
    const { type } = req.query;
    const userId = (req as any).user.id;

    logger.info('Fetching documents by type for batch', {
      batchId,
      documentType: type,
      userId
    });

    // Get batch and project info
    const batchResult = await pool.query(
      `SELECT ub.project_id, p.owner_id, p.created_by
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
    if (batch.owner_id !== userId && batch.created_by !== userId && batch.uploaded_by !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this batch'
      });
    }

    // Get documents with quality audits for the specified type
    const query = `
      SELECT 
        d.id,
        COALESCE(d.title, d.name) as title,
        d.name as original_filename,
        COALESCE(d.framework, d.template_category, 'General') as document_type,
        d.created_at,
        qa.id as audit_id,
        qa.overall_score,
        qa.overall_grade,
        qa.quality_level,
        qa.completeness_score,
        qa.consistency_score,
        qa.professional_quality_score,
        qa.standards_compliance_score,
        qa.accuracy_score,
        qa.context_relevance_score,
        qa.findings,
        qa.issues,
        qa.recommendations,
        qa.audited_at
      FROM documents d
      LEFT JOIN quality_audits qa ON d.id = qa.document_id
      WHERE d.project_id = $1
        AND COALESCE(d.framework, d.template_category, 'General') = $2
      ORDER BY qa.overall_score DESC NULLS LAST, d.created_at DESC
    `;

    const result = await pool.query(query, [batch.project_id, type]);

    const documents = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      originalFilename: row.original_filename,
      documentType: row.document_type,
      createdAt: row.created_at,
      qualityAudit: row.audit_id ? {
        id: row.audit_id,
        overallScore: row.overall_score,
        overallGrade: row.overall_grade,
        qualityLevel: row.quality_level,
        completenessScore: row.completeness_score,
        consistencyScore: row.consistency_score,
        professionalQualityScore: row.professional_quality_score,
        standardsComplianceScore: row.standards_compliance_score,
        accuracyScore: row.accuracy_score,
        contextRelevanceScore: row.context_relevance_score,
        findings: row.findings,
        issues: row.issues,
        recommendations: row.recommendations,
        auditedAt: row.audited_at
      } : null
    }));

    // Calculate average scores for the 6 quality dimensions
    const documentsWithAudits = documents.filter(doc => doc.qualityAudit);
    let avgCompleteness = 0;
    let avgConsistency = 0;
    let avgProfessionalQuality = 0;
    let avgStandardsCompliance = 0;
    let avgAccuracy = 0;
    let avgContextRelevance = 0;

    if (documentsWithAudits.length > 0) {
      const totals = documentsWithAudits.reduce((acc, doc) => {
        const qa = doc.qualityAudit!;
        acc.completeness += qa.completenessScore || 0;
        acc.consistency += qa.consistencyScore || 0;
        acc.professionalQuality += qa.professionalQualityScore || 0;
        acc.standardsCompliance += qa.standardsComplianceScore || 0;
        acc.accuracy += qa.accuracyScore || 0;
        acc.contextRelevance += qa.contextRelevanceScore || 0;
        return acc;
      }, {
        completeness: 0,
        consistency: 0,
        professionalQuality: 0,
        standardsCompliance: 0,
        accuracy: 0,
        contextRelevance: 0
      });

      const count = documentsWithAudits.length;
      avgCompleteness = totals.completeness / count;
      avgConsistency = totals.consistency / count;
      avgProfessionalQuality = totals.professionalQuality / count;
      avgStandardsCompliance = totals.standardsCompliance / count;
      avgAccuracy = totals.accuracy / count;
      avgContextRelevance = totals.contextRelevance / count;
    }

    res.json({
      success: true,
      data: documents,
      averages: {
        completeness: Math.round(avgCompleteness * 100) / 100,
        consistency: Math.round(avgConsistency * 100) / 100,
        professionalQuality: Math.round(avgProfessionalQuality * 100) / 100,
        standardsCompliance: Math.round(avgStandardsCompliance * 100) / 100,
        accuracy: Math.round(avgAccuracy * 100) / 100,
        contextRelevance: Math.round(avgContextRelevance * 100) / 100
      }
    });

  } catch (error: any) {
    logger.error('Failed to fetch documents by type', {
      error: error.message,
      stack: error.stack,
      batchId: req.params.batchId,
      documentType: req.query.type
    });
    next(error);
  }
});

// ============================================================================
// GET /api/assessment/:assessmentId
// Get assessment data
// ============================================================================

/**
 * Authentication is now required for viewing assessments.
 * Users must register and authenticate before accessing assessment data.
 */

router.get('/:assessmentId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
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

router.get('/:assessmentId/export', authenticate, async (req: Request, res: Response, next: NextFunction) => {
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

router.post('/batch/:batchId/complete', authenticate, async (req: Request, res: Response, next: NextFunction) => {
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
    // Ensure gap_analysis includes all_gaps and all_recommendations
    const gapAnalysis = assessmentResult.gap_analysis || {};
    if (!gapAnalysis.all_gaps) {
      gapAnalysis.all_gaps = [
        ...(gapAnalysis.critical_gaps || []),
        ...(gapAnalysis.high_priority_gaps || []),
        ...(gapAnalysis.medium_priority_gaps || [])
      ];
    }
    
    const assessmentData = {
      portfolio_summary: assessmentResult.portfolio_summary,
      breakdown: assessmentResult.breakdown,
      gap_analysis: gapAnalysis,
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
router.post('/batch/:batchId/add-documents', authenticate, async (req: Request, res: Response, next: NextFunction) => {
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
    // Verify user has access to this batch
    if (batch.uploaded_by !== userId && batch.project_owner !== userId) {
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
router.post('/batch/:batchId/regenerate', authenticate, async (req: Request, res: Response, next: NextFunction) => {
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

