/**
 * Quality Audit API Routes
 * Endpoints for accessing and managing quality audit results
 */

import express, { Request, Response, NextFunction } from 'express'
import Joi from 'joi'
import { authenticateToken } from '../middleware/auth'
import { validate } from '../middleware/validation'
import { logger } from '../utils/logger'
import { pool } from '../database/connection'
import { qualityAuditService } from '../services/qualityAuditService'
import { templateImprovementService } from '../services/templateImprovementService'

const router = express.Router()

/**
 * GET /api/quality-audits/document/:documentId
 * Get quality audit results for a specific document
 */
router.get(
  '/document/:documentId',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.params
      const userId = (req as any).user?.id
      const userRole = (req as any).user?.role?.toLowerCase()
      const isSuperAdmin = userRole === 'super_admin'
      const isAdmin = userRole === 'admin'

      // Get user's company_id for access checking
      let userCompanyId: string | null = null
      if (!isSuperAdmin) {
        try {
          const userResult = await pool.query("SELECT company_id FROM users WHERE id = $1", [userId])
          if (userResult.rows.length > 0) {
            userCompanyId = userResult.rows[0].company_id
          }
        } catch (err: any) {
          // If company_id column doesn't exist, log warning but continue
          if (err.message?.includes('column "company_id"') || err.code === '42703') {
            logger.warn('company_id column not found, checking access by owner_id only')
          } else {
            throw err
          }
        }
      }

      // Verify user has access to this document's project
      let accessCheck
      try {
        if (isSuperAdmin) {
          // Super admin can access any document - just verify document exists
          accessCheck = await pool.query(
            `SELECT d.id, d.project_id, p.company_id
             FROM documents d
             JOIN projects p ON d.project_id = p.id
             WHERE d.id = $1
             LIMIT 1`,
            [documentId]
          )
        } else if (isAdmin && userCompanyId) {
          // Admin can access documents from their company
          accessCheck = await pool.query(
            `SELECT d.id, d.project_id, p.company_id
             FROM documents d
             JOIN projects p ON d.project_id = p.id
             WHERE d.id = $1 AND p.company_id = $2
             LIMIT 1`,
            [documentId, userCompanyId]
          )
        } else {
          // Regular users: check ownership
          accessCheck = await pool.query(
            `SELECT d.id, d.project_id, p.company_id
             FROM documents d
             JOIN projects p ON d.project_id = p.id
             WHERE d.id = $1
             AND (p.created_by = $2 OR p.owner_id = $2 OR p.team_members ? $2::text)
             LIMIT 1`,
            [documentId, userId]
          )
        }
      } catch (err: any) {
        // If company_id column doesn't exist, fall back to owner check
        if (err.message?.includes('column "company_id"') || err.code === '42703') {
          if (isSuperAdmin) {
            accessCheck = await pool.query(
              `SELECT d.id, d.project_id
               FROM documents d
               JOIN projects p ON d.project_id = p.id
               WHERE d.id = $1
               LIMIT 1`,
              [documentId]
            )
          } else {
            accessCheck = await pool.query(
              `SELECT d.id, d.project_id
               FROM documents d
               JOIN projects p ON d.project_id = p.id
               WHERE d.id = $1
               AND (p.created_by = $2 OR p.owner_id = $2 OR p.team_members ? $2::text)
               LIMIT 1`,
              [documentId, userId]
            )
          }
        } else {
          throw err
        }
      }

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        })
      }

      // Include document content for detailed compliance breakdown analysis
      const includeContent = req.query.includeContent === 'true'
      const audit = await qualityAuditService.getDocumentAudit(documentId, includeContent)

      if (!audit) {
        return res.status(404).json({
          success: false,
          error: 'No quality audit found for this document'
        })
      }

      res.json({
        success: true,
        audit
      })
    } catch (error: unknown) {
      logger.error('[QUALITY-AUDIT-API] Failed to get document audit', {
        error: error instanceof Error ? error.message : String(error)
      })
      next(error)
    }
  }
)

/**
 * POST /api/quality-audits/trigger
 * Manually trigger quality audit for a document
 */
const triggerAuditSchema = Joi.object({
  documentId: Joi.string().uuid().required()
})

router.post(
  '/trigger',
  authenticateToken,
  validate(triggerAuditSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.body
      const userId = (req as any).user?.id
      const userRole = (req as any).user?.role?.toLowerCase()
      const isSuperAdmin = userRole === 'super_admin'
      const isAdmin = userRole === 'admin'

      // Get user's company_id for access checking
      let userCompanyId: string | null = null
      if (!isSuperAdmin) {
        try {
          const userResult = await pool.query("SELECT company_id FROM users WHERE id = $1", [userId])
          if (userResult.rows.length > 0) {
            userCompanyId = userResult.rows[0].company_id
          }
        } catch (err: any) {
          // If company_id column doesn't exist, log warning but continue
          if (err.message?.includes('column "company_id"') || err.code === '42703') {
            logger.warn('company_id column not found, checking access by owner_id only')
          } else {
            throw err
          }
        }
      }

      // Verify user has access
      let accessCheck
      try {
        if (isSuperAdmin) {
          // Super admin can access any document - just verify document exists
          accessCheck = await pool.query(
            `SELECT d.id, d.project_id, p.company_id
             FROM documents d
             JOIN projects p ON d.project_id = p.id
             WHERE d.id = $1
             LIMIT 1`,
            [documentId]
          )
        } else if (isAdmin && userCompanyId) {
          // Admin can access documents from their company
          accessCheck = await pool.query(
            `SELECT d.id, d.project_id, p.company_id
             FROM documents d
             JOIN projects p ON d.project_id = p.id
             WHERE d.id = $1 AND p.company_id = $2
             LIMIT 1`,
            [documentId, userCompanyId]
          )
        } else {
          // Regular users: check ownership
          accessCheck = await pool.query(
            `SELECT d.id, d.project_id, p.company_id
             FROM documents d
             JOIN projects p ON d.project_id = p.id
             WHERE d.id = $1
             AND (p.created_by = $2 OR p.owner_id = $2 OR p.team_members ? $2::text)
             LIMIT 1`,
            [documentId, userId]
          )
        }
      } catch (err: any) {
        // If company_id column doesn't exist, fall back to owner check
        if (err.message?.includes('column "company_id"') || err.code === '42703') {
          if (isSuperAdmin) {
            accessCheck = await pool.query(
              `SELECT d.id, d.project_id
               FROM documents d
               JOIN projects p ON d.project_id = p.id
               WHERE d.id = $1
               LIMIT 1`,
              [documentId]
            )
          } else {
            accessCheck = await pool.query(
              `SELECT d.id, d.project_id
               FROM documents d
               JOIN projects p ON d.project_id = p.id
               WHERE d.id = $1
               AND (p.created_by = $2 OR p.owner_id = $2 OR p.team_members ? $2::text)
               LIMIT 1`,
              [documentId, userId]
            )
          }
        } else {
          throw err
        }
      }

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        })
      }

      // Get document content and context
      const docResult = await pool.query(
        `SELECT d.content, d.title, d.project_id, t.name as document_type
         FROM documents d
         LEFT JOIN templates t ON d.template_id = t.id
         WHERE d.id = $1`,
        [documentId]
      )

      if (docResult.rows.length === 0) {
        logger.warn('[QUALITY-AUDIT-API] Document not found', { documentId })
        return res.status(404).json({
          success: false,
          error: 'Document not found'
        })
      }

      const document = docResult.rows[0]

      // Validate document has content
      if (!document.content || typeof document.content !== 'string' || document.content.trim().length === 0) {
        logger.warn('[QUALITY-AUDIT-API] Document has no content', { documentId })
        return res.status(400).json({
          success: false,
          error: 'Document has no content to audit. Please ensure the document has been generated.'
        })
      }

      // Get project context
      const projectResult = await pool.query(
        'SELECT * FROM projects WHERE id = $1',
        [document.project_id]
      )

      if (projectResult.rows.length === 0) {
        logger.warn('[QUALITY-AUDIT-API] Project not found', { 
          documentId, 
          projectId: document.project_id 
        })
        return res.status(404).json({
          success: false,
          error: 'Project not found for this document'
        })
      }

      // Trigger audit
      logger.info('[QUALITY-AUDIT-API] Manual audit triggered', {
        documentId,
        userId,
        timestamp: new Date().toISOString(),
        contentLength: document.content.length
      })

      // Wrap audit in try-catch for better error handling
      let auditResult
      try {
        auditResult = await qualityAuditService.auditDocument(
          documentId,
          document.content,
          document.document_type || document.title || 'Document',
          projectResult.rows[0],
          userId
        )
      } catch (auditError: any) {
        logger.error('[QUALITY-AUDIT-API] Audit service failed', {
          documentId,
          userId,
          error: auditError.message,
          stack: auditError.stack
        })
        
        return res.status(500).json({
          success: false,
          error: auditError.message || 'Quality audit failed. Please try again or contact support if the issue persists.'
        })
      }

      logger.info('[QUALITY-AUDIT-API] Audit completed successfully', {
        documentId,
        userId,
        overallScore: auditResult.overallScore,
        overallGrade: auditResult.overallGrade
      })

      res.json({
        success: true,
        audit: auditResult,
        message: 'Quality audit completed successfully'
      })
    } catch (error: unknown) {
      logger.error('[QUALITY-AUDIT-API] Failed to trigger audit', {
        error: error instanceof Error ? error.message : String(error)
      })
      next(error)
    }
  }
)

/**
 * GET /api/quality-audits/stats
 * Get quality audit statistics (30-day rolling)
 */
router.get(
  '/stats',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await qualityAuditService.getQualityStats()
      
      res.json({
        success: true,
        stats
      })
    } catch (error: unknown) {
      logger.error('[QUALITY-AUDIT-API] Failed to get stats', {
        error: error instanceof Error ? error.message : String(error)
      })
      next(error)
    }
  }
)

/**
 * GET /api/quality-audits/provider-comparison
 * Compare quality across AI providers
 */
router.get(
  '/provider-comparison',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const comparison = await qualityAuditService.getProviderQualityComparison()
      
      res.json({
        success: true,
        providers: comparison
      })
    } catch (error: unknown) {
      logger.error('[QUALITY-AUDIT-API] Failed to get provider comparison', {
        error: error instanceof Error ? error.message : String(error)
      })
      next(error)
    }
  }
)

/**
 * GET /api/quality-audits/common-issues
 * Get most common quality issues across all audits
 */
router.get(
  '/common-issues',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string || '20', 10)
      const issues = await qualityAuditService.getCommonIssues(limit)
      
      res.json({
        success: true,
        issues
      })
    } catch (error: unknown) {
      logger.error('[QUALITY-AUDIT-API] Failed to get common issues', {
        error: error instanceof Error ? error.message : String(error)
      })
      next(error)
    }
  }
)

/**
 * GET /api/quality-audits/template-improvements
 * Get pending template improvement suggestions
 */
router.get(
  '/template-improvements',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        status: req.query.status as string,
        priority: req.query.priority as string,
        templateId: req.query.templateId as string
      }

      const suggestions = await templateImprovementService.getPendingSuggestions(filters)
      
      res.json({
        success: true,
        suggestions
      })
    } catch (error: unknown) {
      logger.error('[QUALITY-AUDIT-API] Failed to get template improvements', {
        error: error instanceof Error ? error.message : String(error)
      })
      next(error)
    }
  }
)

/**
 * POST /api/quality-audits/template-improvements/:suggestionId/approve
 * Approve a template improvement suggestion
 */
router.post(
  '/template-improvements/:suggestionId/approve',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { suggestionId } = req.params
      const userId = (req as any).user?.id

      await templateImprovementService.approveSuggestion(suggestionId, userId)
      
      res.json({
        success: true,
        message: 'Suggestion approved successfully'
      })
    } catch (error: unknown) {
      logger.error('[QUALITY-AUDIT-API] Failed to approve suggestion', {
        error: error instanceof Error ? error.message : String(error)
      })
      next(error)
    }
  }
)

/**
 * POST /api/quality-audits/template-improvements/:suggestionId/reject
 * Reject a template improvement suggestion
 */
const rejectSchema = Joi.object({
  reason: Joi.string().required().min(10).max(500)
})

router.post(
  '/template-improvements/:suggestionId/reject',
  authenticateToken,
  validate(rejectSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { suggestionId } = req.params
      const { reason } = req.body
      const userId = (req as any).user?.id

      await templateImprovementService.rejectSuggestion(suggestionId, userId, reason)
      
      res.json({
        success: true,
        message: 'Suggestion rejected'
      })
    } catch (error: unknown) {
      logger.error('[QUALITY-AUDIT-API] Failed to reject suggestion', {
        error: error instanceof Error ? error.message : String(error)
      })
      next(error)
    }
  }
)

/**
 * POST /api/quality-audits/template-improvements/:suggestionId/implement
 * Implement approved template improvements
 */
router.post(
  '/template-improvements/:suggestionId/implement',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { suggestionId } = req.params
      const userId = (req as any).user?.id

      await templateImprovementService.implementImprovements(suggestionId, userId)
      
      res.json({
        success: true,
        message: 'Improvements implemented successfully. New template version created.'
      })
    } catch (error: unknown) {
      logger.error('[QUALITY-AUDIT-API] Failed to implement improvements', {
        error: error instanceof Error ? error.message : String(error)
      })
      next(error)
    }
  }
)

/**
 * POST /api/quality-audits/template-optimization/:suggestionId/apply
 * Apply AI-generated template optimization (MANUAL GATE)
 */
router.post(
  '/template-optimization/:suggestionId/apply',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { suggestionId } = req.params
      const userId = (req as any).user?.id

      // Check if user is admin or super_admin
      const userResult = await pool.query(
        'SELECT role FROM users WHERE id = $1',
        [userId]
      )

      const userRole = userResult.rows[0]?.role?.toLowerCase()
      const isAdmin = userRole === 'admin'
      const isSuperAdmin = userRole === 'super_admin'

      if (userResult.rows.length === 0 || (!isAdmin && !isSuperAdmin)) {
        return res.status(403).json({
          success: false,
          error: 'Only administrators can apply template optimizations'
        })
      }

      const { templateOptimizationService } = await import('../services/templateOptimizationService')
      await templateOptimizationService.applyOptimization(suggestionId, userId)
      
      logger.info('[QUALITY-AUDIT-API] Template optimization applied', {
        suggestionId,
        adminId: userId
      })

      res.json({
        success: true,
        message: 'Template optimization applied successfully. Template version incremented.'
      })
    } catch (error: unknown) {
      logger.error('[QUALITY-AUDIT-API] Failed to apply optimization', {
        error: error instanceof Error ? error.message : String(error)
      })
      next(error)
    }
  }
)

/**
 * GET /api/quality-audits/template-optimization/:suggestionId
 * Get detailed optimization suggestion with diff view
 */
router.get(
  '/template-optimization/:suggestionId',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { suggestionId } = req.params

      const { templateOptimizationService } = await import('../services/templateOptimizationService')
      const suggestion = await templateOptimizationService.getOptimizationSuggestion(suggestionId)
      
      if (!suggestion) {
        return res.status(404).json({
          success: false,
          error: 'Optimization suggestion not found'
        })
      }

      res.json({
        success: true,
        suggestion
      })
    } catch (error: unknown) {
      logger.error('[QUALITY-AUDIT-API] Failed to get optimization', {
        error: error instanceof Error ? error.message : String(error)
      })
      next(error)
    }
  }
)

/**
 * POST /api/quality-audits/analyze-templates
 * Manually trigger template analysis (admin only)
 * Optional: Analyze specific template by passing templateId in body
 */
router.post(
  '/analyze-templates',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userRole = (req as any).user?.role?.toLowerCase()
      const isAdmin = userRole === 'admin'
      const isSuperAdmin = userRole === 'super_admin'

      // Admin or super_admin only
      if (!isAdmin && !isSuperAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        })
      }

      const { templateId } = req.body

      if (templateId) {
        // Analyze specific template
        logger.info('[QUALITY-AUDIT-API] Manual template analysis triggered for specific template', {
          templateId
        })

        // Run async (don't wait for completion)
        templateImprovementService.analyzeTemplateQuality(templateId).catch(err => {
          logger.error('[QUALITY-AUDIT-API] Template analysis failed', { 
            templateId,
            error: err 
          })
        })
        
        res.json({
          success: true,
          message: `Template analysis started for template ${templateId}. Check back in a few minutes.`
        })
      } else {
        // Analyze all templates
        logger.info('[QUALITY-AUDIT-API] Manual template analysis triggered for all templates')

        // Run async (don't wait for completion)
        templateImprovementService.analyzeAllTemplates().catch(err => {
          logger.error('[QUALITY-AUDIT-API] Template analysis failed', { error: err })
        })
        
        res.json({
          success: true,
          message: 'Template analysis started for all templates. This may take several minutes.'
        })
      }
    } catch (error: unknown) {
      logger.error('[QUALITY-AUDIT-API] Failed to start template analysis', {
        error: error instanceof Error ? error.message : String(error)
      })
      next(error)
    }
  }
)

export default router


// ─────────────────────────────────────────────────────────────────────────────
// DRACO (AI Review Board) Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/quality-audits/draco-review
 * Manually trigger a full DRACO AI Review Board analysis for a document.
 * DRACO must be enabled on the document's template for this to run.
 * In advisory mode (default), always runs and returns results without blocking.
 */
const triggerDracoSchema = Joi.object({
  documentId: Joi.string().uuid().required(),
})

router.post(
  '/draco-review',
  authenticateToken,
  validate(triggerDracoSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.body
      const userId = (req as any).user?.id

      // Fetch document + project context
      const docResult = await pool.query(
        `SELECT d.id, d.content, d.name, d.template_id, d.project_id, t.name as template_name, t.draco_enabled
         FROM documents d
         LEFT JOIN templates t ON d.template_id = t.id
         WHERE d.id = $1`,
        [documentId]
      )

      if (!docResult.rows.length) {
        return res.status(404).json({ success: false, error: 'Document not found' })
      }

      const doc = docResult.rows[0]

      if (!doc.content || doc.content.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Document has no content' })
      }

      // Check access
      const accessCheck = await pool.query(
        `SELECT d.id FROM documents d
         JOIN projects p ON d.project_id = p.id
         WHERE d.id = $1 AND (p.created_by = $2 OR p.owner_id = $2 OR p.team_members ? $2::text)`,
        [documentId, userId]
      )

      const userRole = (req as any).user?.role?.toLowerCase()
      if (accessCheck.rows.length === 0 && userRole !== 'super_admin' && userRole !== 'admin') {
        return res.status(403).json({ success: false, error: 'Access denied' })
      }

      // Get project context
      const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [doc.project_id])
      const projectContext = projectResult.rows[0] ?? {}

      logger.info('[DRACO-API] Manual DRACO review triggered', { documentId, userId })

      const { dracoService } = await import('../services/dracoService')
      try {
        const review = await dracoService.runFullReview({
          documentId,
          content: doc.content,
          documentType: doc.template_name || doc.name || 'Document',
          projectContext,
          templateId: doc.template_id || undefined,
          userId: userId || 'system',
        })

        res.json({
          success: true,
          review,
          message: `DRACO Review Board completed. Verdict: ${review.verdict}`,
        })
      } catch (dracoErr: any) {
        if (dracoErr?.message === 'DRACO_DISABLED_FOR_TEMPLATE') {
          return res.status(400).json({
            success: false,
            error: 'DRACO is not enabled for this document\'s template. Enable it in template settings.',
          })
        }
        throw dracoErr
      }
    } catch (error: unknown) {
      logger.error('[DRACO-API] Failed to run DRACO review', {
        error: error instanceof Error ? error.message : String(error),
      })
      next(error)
    }
  }
)

/**
 * GET /api/quality-audits/draco-review/:documentId
 * Get the latest DRACO review result for a document
 */
router.get(
  '/draco-review/:documentId',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.params

      const { dracoService } = await import('../services/dracoService')
      const review = await dracoService.getDocumentReview(documentId)

      if (!review) {
        return res.status(404).json({
          success: false,
          error: 'No DRACO review found for this document',
        })
      }

      res.json({ success: true, review })
    } catch (error: unknown) {
      logger.error('[DRACO-API] Failed to get DRACO review', {
        error: error instanceof Error ? error.message : String(error),
      })
      next(error)
    }
  }
)

/**
 * GET /api/quality-audits/draco-board/:documentId
 * Get individual board member results for a document's latest DRACO review
 */
router.get(
  '/draco-board/:documentId',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.params

      const { dracoService } = await import('../services/dracoService')
      const review = await dracoService.getDocumentReview(documentId)

      if (!review) {
        return res.status(404).json({ success: false, error: 'No DRACO review found' })
      }

      res.json({
        success: true,
        board: {
          evidence_validator: review.board_results.evidence_validator,
          governance_evaluator: review.board_results.governance_evaluator,
          counterfactual_challenger: review.board_results.counterfactual_challenger,
        },
        strategic_assessment: review.strategic_assessment,
        model_rotation_used: review.model_rotation_used,
        verdict: review.verdict,
        overall_score: review.overall_draco_score,
      })
    } catch (error: unknown) {
      logger.error('[DRACO-API] Failed to get board results', {
        error: error instanceof Error ? error.message : String(error),
      })
      next(error)
    }
  }
)

/**
 * GET /api/quality-audits/draco-stats
 * Get DRACO review board statistics and provider independence rankings (admin)
 */
router.get(
  '/draco-stats',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { dracoService } = await import('../services/dracoService')
      const stats = await dracoService.getReviewStats()
      res.json({ success: true, stats })
    } catch (error: unknown) {
      logger.error('[DRACO-API] Failed to get stats', {
        error: error instanceof Error ? error.message : String(error),
      })
      next(error)
    }
  }
)
