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

      // Verify user has access to this document's project
      const accessCheck = await pool.query(
        `SELECT d.id, d.project_id
         FROM documents d
         JOIN projects p ON d.project_id = p.id
         WHERE d.id = $1
         AND (p.created_by = $2 OR p.owner_id = $2)
         LIMIT 1`,
        [documentId, userId]
      )

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        })
      }

      const audit = await qualityAuditService.getDocumentAudit(documentId)

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

      // Verify user has access
      const accessCheck = await pool.query(
        `SELECT d.id, d.project_id
         FROM documents d
         JOIN projects p ON d.project_id = p.id
         WHERE d.id = $1
         AND (p.created_by = $2 OR p.owner_id = $2)
         LIMIT 1`,
        [documentId, userId]
      )

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        })
      }

      // Get document content and context
      const docResult = await pool.query(
        'SELECT content, type, project_id FROM documents WHERE id = $1',
        [documentId]
      )

      if (docResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Document not found'
        })
      }

      const document = docResult.rows[0]

      // Get project context
      const projectResult = await pool.query(
        'SELECT * FROM projects WHERE id = $1',
        [document.project_id]
      )

      // Trigger audit
      logger.info('[QUALITY-AUDIT-API] Manual audit triggered', {
        documentId,
        userId
      })

      const auditResult = await qualityAuditService.auditDocument(
        documentId,
        document.content,
        document.type,
        projectResult.rows[0],
        userId
      )

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
 * POST /api/quality-audits/analyze-templates
 * Manually trigger template analysis (admin only)
 * Optional: Analyze specific template by passing templateId in body
 */
router.post(
  '/analyze-templates',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userRole = (req as any).user?.role

      // Admin only
      if (userRole !== 'admin') {
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

