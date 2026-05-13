/**
 * Compliance API Routes
 * SC-118: Document Compliance Validation Engine and Result Persistence
 * SC-119: Compliance Audit Trail and Verification History
 * SC-120: Compliance Dashboard and Trend Visibility
 * SC-121: Compliance Recommendations and Gap Remediation Guidance
 */

import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { pool } from '../database/connection';
import { logger } from '../utils/logger';
import { complianceValidationEngine } from '../modules/compliance/complianceValidationEngine';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validation';
import {
  StandardsPackType,
  ComplianceStatus,
  RuleSeverity,
  ValidateComplianceRequest,
} from '../modules/compliance/types';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const validateComplianceSchema = Joi.object({
  documentId: Joi.string().uuid().required(),
  packIds: Joi.array().items(Joi.string().uuid()).optional(),
  packTypes: Joi.array().items(Joi.string().valid('PMBOK', 'BABOK', 'DMBOK', 'CUSTOM')).optional(),
  ruleIds: Joi.array().items(Joi.string().uuid()).optional(),
  includeRecommendations: Joi.boolean().default(true),
  compareWithPrevious: Joi.boolean().default(true),
});

const upsertRuleSchema = Joi.object({
  packId: Joi.string().uuid().required(),
  categoryId: Joi.string().uuid().required(),
  code: Joi.string().max(100).required(),
  name: Joi.string().max(255).required(),
  description: Joi.string().required(),
  rationale: Joi.string().optional(),
  validationType: Joi.string().valid(
    'KEYWORD_PRESENCE', 'SECTION_PRESENCE', 'STRUCTURE_CHECK',
    'CONTENT_QUALITY', 'TERMINOLOGY_CHECK', 'REFERENCE_CHECK',
    'METRIC_PRESENCE', 'STAKEHOLDER_COVERAGE', 'RISK_ASSESSMENT', 'CUSTOM_LOGIC'
  ).required(),
  severity: Joi.string().valid('CRITICAL', 'MAJOR', 'MINOR', 'INFORMATIONAL').default('MINOR'),
  weight: Joi.number().min(0).max(10).default(1),
  isActive: Joi.boolean().default(true),
  isRequired: Joi.boolean().default(false),
  applicableDocTypes: Joi.array().items(Joi.string()).default([]),
  validationConfig: Joi.object().default({}),
  remediationGuidance: Joi.object().default({}),
  standardsReference: Joi.object().default({}),
});

const dashboardQuerySchema = Joi.object({
  projectId: Joi.string().uuid().optional(),
  packTypes: Joi.alternatives().try(
    Joi.array().items(Joi.string().valid('PMBOK', 'BABOK', 'DMBOK', 'CUSTOM')),
    Joi.string().valid('PMBOK', 'BABOK', 'DMBOK', 'CUSTOM')
  ).optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
});


// ============================================================================
// COMPLIANCE VALIDATION ENDPOINTS (SC-118)
// ============================================================================

/**
 * POST /api/compliance/validate
 * Validate a document against standards packs
 */
router.post('/validate',
  authenticate,
  validate(validateComplianceSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const request: ValidateComplianceRequest = req.body;
      
      logger.info('[COMPLIANCE-API] Validation request received', {
        documentId: request.documentId,
        packTypes: request.packTypes,
        userId: (req as any).user?.id,
      });

      const result = await complianceValidationEngine.validateDocument(request);

      logger.info('[COMPLIANCE-API] Validation completed', {
        documentId: request.documentId,
        aggregatedScore: result.aggregatedScore,
        aggregatedStatus: result.aggregatedStatus,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('[COMPLIANCE-API] Validation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  }
);

/**
 * GET /api/compliance/validation/:id
 * Get a specific validation result
 */
router.get('/validation/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `SELECT cvr.*, sp.name as pack_name, sp.pack_type, d.title as document_title
         FROM compliance_validation_results cvr
         JOIN standards_packs sp ON cvr.pack_id = sp.id
         JOIN documents d ON cvr.document_id = d.id
         WHERE cvr.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Validation result not found',
        });
      }

      // Get rule results for this validation
      const ruleResults = await pool.query(
        `SELECT crr.*, cr.code as rule_code, cr.name as rule_name, sc.name as category_name
         FROM compliance_rule_results crr
         JOIN compliance_rules cr ON crr.rule_id = cr.id
         JOIN standards_categories sc ON crr.category_id = sc.id
         WHERE crr.validation_result_id = $1
         ORDER BY crr.status, crr.severity DESC`,
        [id]
      );

      // Get recommendations
      const recommendations = await pool.query(
        `SELECT * FROM compliance_recommendations
         WHERE validation_result_id = $1
         ORDER BY priority, potential_score_improvement DESC`,
        [id]
      );

      res.json({
        success: true,
        data: {
          ...result.rows[0],
          ruleResults: ruleResults.rows,
          recommendations: recommendations.rows,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/compliance/document/:documentId/history
 * Get validation history for a document
 */
router.get('/document/:documentId/history',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await pool.query(
        `SELECT cvr.*, sp.name as pack_name, sp.pack_type
         FROM compliance_validation_results cvr
         JOIN standards_packs sp ON cvr.pack_id = sp.id
         WHERE cvr.document_id = $1
         ORDER BY cvr.validated_at DESC
         LIMIT $2`,
        [documentId, limit]
      );

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// STANDARDS PACKS ENDPOINTS (SC-117)
// ============================================================================

/**
 * GET /api/compliance/packs
 * Get all active standards packs
 */
router.get('/packs',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await pool.query(
        `SELECT sp.*, 
                COUNT(DISTINCT sc.id) as category_count,
                COUNT(DISTINCT cr.id) as rule_count
         FROM standards_packs sp
         LEFT JOIN standards_categories sc ON sp.id = sc.pack_id
         LEFT JOIN compliance_rules cr ON sp.id = cr.pack_id AND cr.is_active = true
         WHERE sp.is_active = true
         GROUP BY sp.id
         ORDER BY sp.pack_type, sp.name`
      );

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/compliance/packs/:id
 * Get a specific standards pack with its categories and rules
 */
router.get('/packs/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const packResult = await pool.query(
        'SELECT * FROM standards_packs WHERE id = $1',
        [id]
      );

      if (packResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Standards pack not found',
        });
      }

      const categoriesResult = await pool.query(
        'SELECT * FROM standards_categories WHERE pack_id = $1 ORDER BY sort_order',
        [id]
      );

      const rulesResult = await pool.query(
        `SELECT cr.*, sc.name as category_name
         FROM compliance_rules cr
         JOIN standards_categories sc ON cr.category_id = sc.id
         WHERE cr.pack_id = $1
         ORDER BY sc.sort_order, cr.code`,
        [id]
      );

      res.json({
        success: true,
        data: {
          ...packResult.rows[0],
          categories: categoriesResult.rows,
          rules: rulesResult.rows,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/compliance/packs/:id/rules
 * Add a new rule to a standards pack
 */
router.post('/packs/:id/rules',
  authenticate,
  validate(upsertRuleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const ruleData = req.body;

      // Verify pack exists
      const packResult = await pool.query(
        'SELECT id FROM standards_packs WHERE id = $1',
        [id]
      );

      if (packResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Standards pack not found',
        });
      }

      const result = await pool.query(
        `INSERT INTO compliance_rules (
          pack_id, category_id, code, name, description, rationale,
          validation_type, severity, weight, is_active, is_required,
          applicable_doc_types, validation_config, remediation_guidance,
          standards_reference, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (pack_id, code) DO UPDATE SET
          category_id = EXCLUDED.category_id,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          rationale = EXCLUDED.rationale,
          validation_type = EXCLUDED.validation_type,
          severity = EXCLUDED.severity,
          weight = EXCLUDED.weight,
          is_active = EXCLUDED.is_active,
          is_required = EXCLUDED.is_required,
          applicable_doc_types = EXCLUDED.applicable_doc_types,
          validation_config = EXCLUDED.validation_config,
          remediation_guidance = EXCLUDED.remediation_guidance,
          standards_reference = EXCLUDED.standards_reference,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *`,
        [
          id,
          ruleData.categoryId,
          ruleData.code,
          ruleData.name,
          ruleData.description,
          ruleData.rationale,
          ruleData.validationType,
          ruleData.severity,
          ruleData.weight,
          ruleData.isActive,
          ruleData.isRequired,
          ruleData.applicableDocTypes,
          JSON.stringify(ruleData.validationConfig),
          JSON.stringify(ruleData.remediationGuidance),
          JSON.stringify(ruleData.standardsReference),
          (req as any).user?.id,
        ]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// COMPLIANCE DASHBOARD ENDPOINTS (SC-120)
// ============================================================================

/**
 * GET /api/compliance/dashboard
 * Get compliance dashboard summary
 */
router.get('/dashboard',
  authenticate,
  validateQuery(dashboardQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId, packTypes, dateFrom, dateTo, limit } = req.query as any;

      // Build query filters
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (projectId) {
        params.push(projectId);
        whereClause += ` AND cvr.project_id = $${params.length}`;
      }

      if (packTypes) {
        const types = Array.isArray(packTypes) ? packTypes : [packTypes];
        params.push(types);
        whereClause += ` AND cvr.pack_type = ANY($${params.length})`;
      }

      if (dateFrom) {
        params.push(dateFrom);
        whereClause += ` AND cvr.validated_at >= $${params.length}`;
      }

      if (dateTo) {
        params.push(dateTo);
        whereClause += ` AND cvr.validated_at <= $${params.length}`;
      }

      // Get summary statistics
      const summaryResult = await pool.query(
        `SELECT 
          COUNT(DISTINCT cvr.document_id) as document_count,
          COUNT(cvr.id) as validation_count,
          ROUND(AVG(cvr.overall_score)::numeric, 2) as average_score,
          ROUND(AVG(cvr.compliance_percentage)::numeric, 2) as average_compliance,
          SUM(cvr.critical_findings) as total_critical_findings,
          SUM(cvr.major_findings) as total_major_findings,
          SUM(cvr.minor_findings) as total_minor_findings,
          COUNT(CASE WHEN cvr.overall_status = 'COMPLIANT' THEN 1 END) as compliant_count,
          COUNT(CASE WHEN cvr.overall_status = 'NON_COMPLIANT' THEN 1 END) as non_compliant_count,
          COUNT(CASE WHEN cvr.overall_status = 'PARTIAL' THEN 1 END) as partial_count
         FROM compliance_validation_results cvr
         ${whereClause}`,
        params
      );

      // Get recent validations
      const recentResult = await pool.query(
        `SELECT cvr.*, sp.name as pack_name, d.title as document_title
         FROM compliance_validation_results cvr
         JOIN standards_packs sp ON cvr.pack_id = sp.id
         JOIN documents d ON cvr.document_id = d.id
         ${whereClause}
         ORDER BY cvr.validated_at DESC
         LIMIT $${params.length + 1}`,
        [...params, limit || 10]
      );

      // Get trend data (last 30 days)
      const trendResult = await pool.query(
        `SELECT 
          DATE(validated_at) as date,
          ROUND(AVG(overall_score)::numeric, 2) as average_score,
          ROUND(AVG(compliance_percentage)::numeric, 2) as compliance_percentage,
          COUNT(DISTINCT document_id) as document_count,
          SUM(critical_findings) as critical_findings
         FROM compliance_validation_results cvr
         ${whereClause}
         AND cvr.validated_at >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY DATE(validated_at)
         ORDER BY date`,
        params
      );

      // Get pack breakdown
      const packBreakdownResult = await pool.query(
        `SELECT 
          cvr.pack_type,
          sp.name as pack_name,
          COUNT(cvr.id) as validation_count,
          ROUND(AVG(cvr.overall_score)::numeric, 2) as average_score,
          ROUND(AVG(cvr.compliance_percentage)::numeric, 2) as compliance_rate
         FROM compliance_validation_results cvr
         JOIN standards_packs sp ON cvr.pack_id = sp.id
         ${whereClause}
         GROUP BY cvr.pack_type, sp.name
         ORDER BY validation_count DESC`,
        params
      );

      // Get top recommendations
      const recommendationsResult = await pool.query(
        `SELECT cr.*, cvr.document_id, d.title as document_title
         FROM compliance_recommendations cr
         JOIN compliance_validation_results cvr ON cr.validation_result_id = cvr.id
         JOIN documents d ON cvr.document_id = d.id
         ${whereClause.replace(/cvr\./g, 'cvr.')}
         AND cr.status = 'PENDING'
         ORDER BY 
           CASE cr.priority 
             WHEN 'CRITICAL' THEN 0 
             WHEN 'HIGH' THEN 1 
             WHEN 'MEDIUM' THEN 2 
             ELSE 3 
           END,
           cr.potential_score_improvement DESC
         LIMIT 10`,
        params
      );

      res.json({
        success: true,
        data: {
          summary: summaryResult.rows[0],
          recentValidations: recentResult.rows,
          trends: trendResult.rows,
          packBreakdown: packBreakdownResult.rows,
          topRecommendations: recommendationsResult.rows,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/compliance/dashboard/trends
 * Get compliance trend data
 */
router.get('/dashboard/trends',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId, packType, days } = req.query;
      const dayCount = parseInt(days as string) || 30;

      let whereClause = 'WHERE ct.trend_date >= CURRENT_DATE - $1::interval';
      const params: any[] = [`${dayCount} days`];

      if (projectId) {
        params.push(projectId);
        whereClause += ` AND ct.project_id = $${params.length}`;
      }

      if (packType) {
        params.push(packType);
        whereClause += ` AND ct.pack_type = $${params.length}`;
      }

      const result = await pool.query(
        `SELECT 
          ct.trend_date,
          ct.pack_type,
          ROUND(ct.average_score::numeric, 2) as average_score,
          ROUND(ct.compliance_percentage::numeric, 2) as compliance_percentage,
          ct.document_count,
          ct.validation_count,
          ct.critical_findings,
          ct.major_findings,
          ct.resolved_findings
         FROM compliance_trends ct
         ${whereClause}
         ORDER BY ct.trend_date, ct.pack_type`,
        params
      );

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// COMPLIANCE AUDIT TRAIL ENDPOINTS (SC-119)
// ============================================================================

/**
 * GET /api/compliance/audit-trail
 * Get compliance audit trail entries
 */
router.get('/audit-trail',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { documentId, projectId, eventType, limit, offset } = req.query;

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (documentId) {
        params.push(documentId);
        whereClause += ` AND cat.document_id = $${params.length}`;
      }

      if (projectId) {
        params.push(projectId);
        whereClause += ` AND cat.project_id = $${params.length}`;
      }

      if (eventType) {
        params.push(eventType);
        whereClause += ` AND cat.event_type = $${params.length}`;
      }

      const limitVal = parseInt(limit as string) || 50;
      const offsetVal = parseInt(offset as string) || 0;

      const result = await pool.query(
        `SELECT cat.*, u.name as user_name, u.email as user_email
         FROM compliance_audit_trail cat
         LEFT JOIN users u ON cat.user_id = u.id
         ${whereClause}
         ORDER BY cat.timestamp DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limitVal, offsetVal]
      );

      // Get total count
      const countResult = await pool.query(
        `SELECT COUNT(*) as total FROM compliance_audit_trail cat ${whereClause}`,
        params
      );

      res.json({
        success: true,
        data: {
          entries: result.rows,
          pagination: {
            total: parseInt(countResult.rows[0].total),
            limit: limitVal,
            offset: offsetVal,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/compliance/audit-trail/document/:documentId
 * Get audit trail for a specific document
 */
router.get('/audit-trail/document/:documentId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await pool.query(
        `SELECT cat.*, u.name as user_name
         FROM compliance_audit_trail cat
         LEFT JOIN users u ON cat.user_id = u.id
         WHERE cat.document_id = $1
         ORDER BY cat.timestamp DESC
         LIMIT $2`,
        [documentId, limit]
      );

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// RECOMMENDATIONS ENDPOINTS (SC-121)
// ============================================================================

/**
 * GET /api/compliance/recommendations
 * Get pending compliance recommendations
 */
router.get('/recommendations',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId, priority, status, limit } = req.query;

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (projectId) {
        params.push(projectId);
        whereClause += ` AND cvr.project_id = $${params.length}`;
      }

      if (priority) {
        params.push(priority);
        whereClause += ` AND cr.priority = $${params.length}`;
      }

      if (status) {
        params.push(status);
        whereClause += ` AND cr.status = $${params.length}`;
      }

      const limitVal = parseInt(limit as string) || 20;

      const result = await pool.query(
        `SELECT cr.*, cvr.document_id, d.title as document_title, 
                sp.name as pack_name, sc.name as category_name
         FROM compliance_recommendations cr
         JOIN compliance_validation_results cvr ON cr.validation_result_id = cvr.id
         JOIN documents d ON cvr.document_id = d.id
         JOIN standards_packs sp ON cvr.pack_id = sp.id
         JOIN standards_categories sc ON cr.category_id = sc.id
         ${whereClause}
         ORDER BY 
           CASE cr.priority 
             WHEN 'CRITICAL' THEN 0 
             WHEN 'HIGH' THEN 1 
             WHEN 'MEDIUM' THEN 2 
             ELSE 3 
           END,
           cr.potential_score_improvement DESC
         LIMIT $${params.length + 1}`,
        [...params, limitVal]
      );

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/compliance/recommendations/:id
 * Update recommendation status (e.g., mark as applied)
 */
router.patch('/recommendations/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const result = await pool.query(
        `UPDATE compliance_recommendations
         SET status = $1,
             applied_at = CASE WHEN $1 = 'APPLIED' THEN CURRENT_TIMESTAMP ELSE NULL END,
             applied_by = CASE WHEN $1 = 'APPLIED' THEN $2 ELSE NULL END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [status, (req as any).user?.id, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Recommendation not found',
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// STATISTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/compliance/stats
 * Get overall compliance statistics
 */
router.get('/stats',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Overall stats
      const overallStats = await pool.query(`
        SELECT 
          COUNT(DISTINCT document_id) as total_documents_validated,
          COUNT(*) as total_validations,
          ROUND(AVG(overall_score)::numeric, 2) as average_score,
          ROUND(AVG(compliance_percentage)::numeric, 2) as average_compliance,
          SUM(critical_findings) as total_critical_findings,
          SUM(major_findings) as total_major_findings
        FROM compliance_validation_results
        WHERE validated_at >= CURRENT_DATE - INTERVAL '30 days'
      `);

      // By pack type
      const byPackType = await pool.query(`
        SELECT 
          pack_type,
          COUNT(*) as validation_count,
          ROUND(AVG(overall_score)::numeric, 2) as average_score
        FROM compliance_validation_results
        WHERE validated_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY pack_type
        ORDER BY validation_count DESC
      `);

      // Top issues
      const topIssues = await pool.query(`
        SELECT 
          sc.name as category_name,
          sp.pack_type,
          COUNT(*) as issue_count
        FROM compliance_rule_results crr
        JOIN compliance_validation_results cvr ON crr.validation_result_id = cvr.id
        JOIN standards_categories sc ON crr.category_id = sc.id
        JOIN standards_packs sp ON cvr.pack_id = sp.id
        WHERE crr.status = 'NON_COMPLIANT'
        AND cvr.validated_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY sc.name, sp.pack_type
        ORDER BY issue_count DESC
        LIMIT 10
      `);

      res.json({
        success: true,
        data: {
          overall: overallStats.rows[0],
          byPackType: byPackType.rows,
          topIssues: topIssues.rows,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
