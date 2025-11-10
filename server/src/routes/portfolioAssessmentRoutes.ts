/**
 * Portfolio Assessment Routes
 * 
 * API endpoints for portfolio maturity assessment and gap analysis
 * Part of Client Onboarding Assessment system
 * 
 * @module portfolioAssessmentRoutes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { logger } from '../utils/logger';
import { portfolioAssessmentService } from '../services/portfolioAssessmentService';
import { authenticateToken as authenticate } from '../middleware/auth';
import { buildSslConfig } from '../database/connection';

const router = Router();

// ============================================================================
// SETUP
// ============================================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: buildSslConfig(process.env.DATABASE_URL),
});

// ============================================================================
// ASSESSMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/onboarding/assessment/:projectId
 * Get comprehensive portfolio maturity assessment for project
 * 
 * Query params:
 *  - industry_vertical (optional): Industry for benchmark comparison
 *  - refresh (optional): Force regenerate assessment
 * 
 * Response: {
 *   success: true,
 *   data: {
 *     portfolio_summary: { ... },
 *     breakdown: { ... },
 *     gap_analysis: { ... },
 *     top_documents: [ ... ],
 *     roi_calculation: { ... }
 *   }
 * }
 */
router.get(
  '/assessment/:projectId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const { industry_vertical, refresh } = req.query;

      // Verify user has access to project
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

      // Check if recent assessment exists (unless refresh=true)
      if (!refresh) {
        const recentAssessment = await getRecentAssessment(projectId);
        if (recentAssessment) {
          logger.info('Returning cached assessment', {
            projectId,
            assessmentId: recentAssessment.id,
            age: Date.now() - new Date(recentAssessment.created_at).getTime()
          });

          return res.json({
            success: true,
            data: formatAssessmentResponse(recentAssessment),
            cached: true,
            cached_at: recentAssessment.created_at
          });
        }
      }

      // Generate new assessment
      logger.info('Generating new portfolio assessment', {
        projectId,
        industryVertical: industry_vertical,
        requestedBy: req.user.id
      });

      const assessment = await portfolioAssessmentService.assessProjectPortfolio(
        projectId,
        industry_vertical as string,
        req.user.id
      );

      res.json({
        success: true,
        data: assessment,
        cached: false,
        generated_at: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('Assessment endpoint error', {
        projectId: req.params.projectId,
        error: error.message,
        stack: error.stack
      });

      if (error.message.includes('No quality audit data')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NO_AUDIT_DATA',
            message: 'No quality audit data found. Please upload and process documents first.'
          }
        });
      }

      next(error);
    }
  }
);

/**
 * GET /api/onboarding/gaps/:projectId
 * Get detailed gap analysis for project
 * 
 * Response: {
 *   success: true,
 *   data: {
 *     critical_gaps: [ ... ],
 *     high_priority_gaps: [ ... ],
 *     medium_priority_gaps: [ ... ],
 *     improvement_opportunities: [ ... ]
 *   }
 * }
 */
router.get(
  '/gaps/:projectId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;

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

      // Get latest assessment
      const assessment = await getLatestAssessment(projectId);

      if (!assessment) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NO_ASSESSMENT',
            message: 'No assessment found. Please generate an assessment first.'
          }
        });
      }

      res.json({
        success: true,
        data: {
          critical_gaps: assessment.critical_gaps,
          high_priority_gaps: assessment.high_priority_gaps,
          medium_priority_gaps: assessment.medium_priority_gaps,
          improvement_opportunities: assessment.improvement_opportunities
        },
        assessed_at: assessment.assessment_date
      });

    } catch (error: any) {
      logger.error('Gap analysis endpoint error', {
        projectId: req.params.projectId,
        error: error.message
      });

      next(error);
    }
  }
);

/**
 * GET /api/onboarding/benchmarks/industries
 * Get list of available industries with benchmarks
 * 
 * Response: {
 *   success: true,
 *   data: {
 *     industries: [ { name, count, avg_score } ]
 *   }
 * }
 */
router.get(
  '/benchmarks/industries',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = `
        SELECT 
          industry_vertical,
          COUNT(*) as benchmark_count,
          AVG(avg_quality_score) as avg_score
        FROM industry_benchmarks
        WHERE document_type IS NULL
        GROUP BY industry_vertical
        ORDER BY industry_vertical
      `;

      const result = await pool.query(query);

      res.json({
        success: true,
        data: {
          industries: result.rows.map(row => ({
            name: row.industry_vertical,
            benchmark_count: parseInt(row.benchmark_count),
            avg_score: Math.round(row.avg_score * 100) / 100
          }))
        }
      });

    } catch (error: any) {
      logger.error('Industries list endpoint error', {
        error: error.message
      });

      next(error);
    }
  }
);

/**
 * GET /api/onboarding/benchmarks/:industry/:documentType?
 * Get industry benchmarks for comparison
 * 
 * Response: {
 *   success: true,
 *   data: {
 *     industry_vertical: string,
 *     document_type?: string,
 *     avg_quality_score: number,
 *     quality_distribution: { ... },
 *     sample_size: number
 *   }
 * }
 */
router.get(
  '/benchmarks/:industry',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { industry } = req.params;
      const documentType = req.query.documentType as string | undefined;

      const query = `
        SELECT * FROM industry_benchmarks
        WHERE industry_vertical = $1
          AND ($2::text IS NULL OR document_type = $2)
        ORDER BY last_updated DESC
        LIMIT 1
      `;

      const result = await pool.query(query, [industry, documentType || null]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'BENCHMARK_NOT_FOUND',
            message: `No benchmark data found for industry: ${industry}`
          }
        });
      }

      const benchmark = result.rows[0];

      res.json({
        success: true,
        data: {
          industry_vertical: benchmark.industry_vertical,
          document_type: benchmark.document_type,
          avg_quality_score: benchmark.avg_quality_score,
          median_quality_score: benchmark.median_quality_score,
          percentile_90: benchmark.percentile_90,
          quality_distribution: benchmark.quality_distribution,
          sample_size: benchmark.sample_size,
          last_updated: benchmark.last_updated
        }
      });

    } catch (error: any) {
      logger.error('Benchmarks endpoint error', {
        industry: req.params.industry,
        error: error.message
      });

      next(error);
    }
  }
);

/**
 * GET /api/onboarding/assessment/:projectId/history
 * Get assessment history for project (track progress over time)
 * 
 * Response: {
 *   success: true,
 *   data: {
 *     assessments: [ ... ]
 *   }
 * }
 */
router.get(
  '/assessment/:projectId/history',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const { limit = 10 } = req.query;

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

      const query = `
        SELECT 
          id, assessment_date, total_documents, avg_quality_score,
          maturity_level, maturity_label, gap_percentage
        FROM portfolio_assessments
        WHERE project_id = $1
        ORDER BY assessment_date DESC
        LIMIT $2
      `;

      const result = await pool.query(query, [projectId, limit]);

      res.json({
        success: true,
        data: {
          assessments: result.rows
        }
      });

    } catch (error: any) {
      logger.error('Assessment history endpoint error', {
        projectId: req.params.projectId,
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
  }
}

/**
 * Get recent assessment (cached, < 1 hour old)
 */
async function getRecentAssessment(projectId: string): Promise<any | null> {
  const query = `
    SELECT * FROM portfolio_assessments
    WHERE project_id = $1
      AND created_at > NOW() - INTERVAL '1 hour'
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const result = await pool.query(query, [projectId]);
  return result.rows[0] || null;
}

/**
 * Get latest assessment (any age)
 */
async function getLatestAssessment(projectId: string): Promise<any | null> {
  const query = `
    SELECT * FROM portfolio_assessments
    WHERE project_id = $1
    ORDER BY assessment_date DESC
    LIMIT 1
  `;

  const result = await pool.query(query, [projectId]);
  return result.rows[0] || null;
}

/**
 * Format assessment response from database
 */
function formatAssessmentResponse(assessment: any): any {
  return {
    portfolio_summary: {
      total_documents: assessment.total_documents,
      avg_quality_score: assessment.avg_quality_score,
      avg_grade: assessment.avg_grade,
      maturity_level: assessment.maturity_level,
      maturity_label: assessment.maturity_label,
      industry_benchmark: assessment.industry_benchmark,
      gap_percentage: assessment.gap_percentage
    },
    breakdown: {
      by_framework: assessment.by_framework,
      by_document_type: assessment.by_document_type,
      by_quality_grade: assessment.by_quality_grade,
      quality_distribution: assessment.quality_distribution
    },
    gap_analysis: {
      critical_gaps: assessment.critical_gaps,
      high_priority_gaps: assessment.high_priority_gaps,
      medium_priority_gaps: assessment.medium_priority_gaps,
      improvement_opportunities: assessment.improvement_opportunities
    },
    top_documents: assessment.top_documents,
    roi_calculation: {
      estimated_hours_saved: assessment.estimated_hours_saved,
      estimated_cost_savings: assessment.estimated_cost_savings,
      potential_improvement_value: assessment.potential_improvement_value
    }
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default router;

