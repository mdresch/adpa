import { Request, Response, NextFunction } from 'express';
import { PortfolioAssessmentRepository } from './PortfolioAssessmentRepository';
import { portfolioAssessmentService } from '../../services/portfolioAssessmentService';
import { pool } from '../../database/connection';
import { childLogger } from '../../utils/logger';

export class PortfolioAssessmentController {
  private repository = new PortfolioAssessmentRepository(pool);
  private logger = childLogger({ component: 'PortfolioAssessmentController' });

  getAssessment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const { industry_vertical, refresh } = req.query;

      const hasAccess = await this.repository.verifyProjectAccess(
        (req as any).user.id,
        (req as any).user.role,
        (req as any).user.company_id,
        projectId
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You do not have access to this project' }
        });
      }

      if (!refresh) {
        const recentAssessment = await this.repository.findRecentByProjectId(projectId);
        if (recentAssessment) {
          return res.json({
            success: true,
            data: this.formatAssessmentResponse(recentAssessment),
            cached: true,
            cached_at: recentAssessment.created_at
          });
        }
      }

      const assessment = await portfolioAssessmentService.assessProjectPortfolio(
        projectId,
        industry_vertical as string,
        (req as any).user.id
      );

      res.json({
        success: true,
        data: assessment,
        cached: false,
        generated_at: new Date().toISOString()
      });
    } catch (error: any) {
      this.logger.error("Get assessment error:", error);
      if (error.message.includes('No quality audit data')) {
        return res.status(404).json({
          success: false,
          error: { code: 'NO_AUDIT_DATA', message: 'No quality audit data found.' }
        });
      }
      next(error);
    }
  };

  getGaps = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const hasAccess = await this.repository.verifyProjectAccess(
        (req as any).user.id,
        (req as any).user.role,
        (req as any).user.company_id,
        projectId
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You do not have access to this project' }
        });
      }

      const assessment = await this.repository.findLatestByProjectId(projectId);
      if (!assessment) {
        return res.status(404).json({
          success: false,
          error: { code: 'NO_ASSESSMENT', message: 'No assessment found.' }
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
    } catch (error) {
      next(error);
    }
  };

  getIndustries = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const industries = await this.repository.findAllIndustries();
      res.json({
        success: true,
        data: {
          industries: industries.map((row: any) => ({
            name: row.industry_vertical,
            benchmark_count: parseInt(row.benchmark_count),
            avg_score: Math.round(row.avg_score * 100) / 100
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  };

  getBenchmark = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { industry } = req.params;
      const documentType = req.query.documentType as string | undefined;

      const benchmark = await this.repository.findBenchmark(industry, documentType || null);
      if (!benchmark) {
        return res.status(404).json({
          success: false,
          error: { code: 'BENCHMARK_NOT_FOUND', message: `No benchmark data found for ${industry}` }
        });
      }

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
    } catch (error) {
      next(error);
    }
  };

  getHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const { limit = 10 } = req.query;

      const hasAccess = await this.repository.verifyProjectAccess(
        (req as any).user.id,
        (req as any).user.role,
        (req as any).user.company_id,
        projectId
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You do not have access to this project' }
        });
      }

      const assessments = await this.repository.findHistoryByProjectId(projectId, parseInt(limit as string));
      res.json({ success: true, data: { assessments } });
    } catch (error) {
      next(error);
    }
  };

  private formatAssessmentResponse(assessment: any): any {
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
}
