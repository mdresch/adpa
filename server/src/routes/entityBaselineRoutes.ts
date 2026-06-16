/**
 * Entity Extraction, Baseline, and Drift Detection API Routes
 */

import { Router, Request, Response, NextFunction } from 'express'
import { authenticateToken } from '../middleware/auth'
import { validate, validateQuery } from '../middleware/validation'
import { entityExtractionService } from '../services/entityExtractionService'
import { baselineService as entityBaselineService } from '../services/baselineService'
import { driftDetectionService as entityDriftDetectionService } from '../services/driftDetectionService'
import { logger } from '../utils/logger'
import Joi from 'joi'

const router = Router()

// ============================================================================
// Entity Extraction Routes
// ============================================================================

/**
 * POST /api/entities/extract/document/:documentId
 * Extract entities from a document
 */
router.post(
  '/extract/document/:documentId',
  authenticateToken,
  validate(Joi.object({
    aiProvider: Joi.string().optional(),
    aiModel: Joi.string().optional(),
    includeRelationships: Joi.boolean().optional(),
    minConfidence: Joi.number().min(0).max(100).optional()
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.params
      const options = req.body || {}

      // Get document to verify project access
      const { pool } = await Promise.resolve().then(() => require('../database/connection'))
      const docResult = await pool.query(
        `SELECT project_id FROM documents WHERE id = $1 AND deleted_at IS NULL`,
        [documentId]
      )

      if (docResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Document not found'
        })
      }

      const projectId = docResult.rows[0].project_id

      const result = await entityExtractionService.extractFromDocument(
        documentId,
        projectId,
        options
      )

      res.json({
        success: true,
        data: result
      })
    } catch (error: any) {
      logger.error('❌ Entity extraction failed', {
        documentId: req.params.documentId,
        error: error.message
      })
      next(error)
    }
  }
)

/**
 * POST /api/entities/extract/project/:projectId
 * Extract entities from all documents in a project
 */
router.post(
  '/extract/project/:projectId',
  authenticateToken,
  validate(Joi.object({
    documentIds: Joi.array().items(Joi.string().uuid()).optional(),
    aiProvider: Joi.string().optional(),
    aiModel: Joi.string().optional(),
    minConfidence: Joi.number().min(0).max(100).optional()
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params
      const options = req.body || {}

      const result = await entityExtractionService.extractFromProject(projectId, options)

      res.json({
        success: true,
        data: result
      })
    } catch (error: any) {
      logger.error('❌ Project entity extraction failed', {
        projectId: req.params.projectId,
        error: error.message
      })
      next(error)
    }
  }
)

/**
 * GET /api/entities/project/:projectId
 * Get all entities for a project
 */
router.get(
  '/project/:projectId',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params
      const filters: any = {}

      if (req.query.entityType) {
        filters.entityType = req.query.entityType as string
      }
      if (req.query.documentId) {
        filters.documentId = req.query.documentId as string
      }
      if (req.query.minConfidence) {
        filters.minConfidence = parseInt(req.query.minConfidence as string, 10)
      }
      if (req.query.status) {
        filters.status = req.query.status as string
      }

      const entities = await entityExtractionService.getProjectEntities(projectId, filters)

      res.json({
        success: true,
        data: entities,
        count: entities.length
      })
    } catch (error: any) {
      logger.error('❌ Failed to get project entities', {
        projectId: req.params.projectId,
        error: error.message
      })
      next(error)
    }
  }
)

/**
 * GET /api/entities/:entityId
 * Get entity by ID
 */
router.get(
  '/:entityId',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityId } = req.params

      const entity = await entityExtractionService.getEntityById(entityId)

      if (!entity) {
        return res.status(404).json({
          success: false,
          error: 'Entity not found'
        })
      }

      res.json({
        success: true,
        data: entity
      })
    } catch (error: any) {
      next(error)
    }
  }
)

/**
 * POST /api/entities/:entityId/verify
 * Verify an entity
 * For low confidence entities, requires confirmation flag
 */
router.post(
  '/:entityId/verify',
  authenticateToken,
  validate(Joi.object({
    verified: Joi.boolean().default(true),
    confirmed: Joi.boolean().optional() // Required for low confidence entities
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityId } = req.params
      const { verified, confirmed } = req.body
      const userId = (req as any).user?.id

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        })
      }

      // Get entity to check confidence
      const entity = await entityExtractionService.getEntityById(entityId)
      
      if (!entity) {
        return res.status(404).json({
          success: false,
          error: 'Entity not found'
        })
      }

      // Check if verification requires confirmation for low confidence
      const confidence = entity.extraction_confidence || 50
      const requiresConfirmation = confidence < 50 && verified && !confirmed

      if (requiresConfirmation) {
        return res.status(400).json({
          success: false,
          error: 'CONFIRMATION_REQUIRED',
          message: 'Low confidence entity requires confirmation before verification',
          confidence,
          requiresConfirmation: true
        })
      }

      await entityExtractionService.verifyEntity(entityId, userId, verified)

      res.json({
        success: true,
        message: `Entity ${verified ? 'verified' : 'unverified'}`,
        autoVerified: confidence >= 80 && verified
      })
    } catch (error: any) {
      next(error)
    }
  }
)

/**
 * DELETE /api/entities/:entityId
 * Delete an entity (soft delete)
 */
router.delete(
  '/:entityId',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityId } = req.params

      await entityExtractionService.deleteEntity(entityId)

      res.json({
        success: true,
        message: 'Entity deleted'
      })
    } catch (error: any) {
      next(error)
    }
  }
)

// ============================================================================
// Baseline Routes
// ============================================================================

/**
 * POST /api/entities/baselines/project/:projectId
 * Create a baseline for a project
 */
router.post(
  '/baselines/project/:projectId',
  authenticateToken,
  validate(Joi.object({
    baselineName: Joi.string().required(),
    baselineType: Joi.string().valid('project', 'phase', 'milestone', 'version', 'custom').required(),
    phaseId: Joi.string().uuid().optional(),
    milestoneId: Joi.string().uuid().optional(),
    documentVersionId: Joi.string().uuid().optional(),
    includeMetadata: Joi.boolean().default(true)
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params
      const options = req.body
      const userId = (req as any).user?.id

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        })
      }

      const baseline = await entityBaselineService.createBaseline(projectId, userId, options)

      res.json({
        success: true,
        data: baseline
      })
    } catch (error: any) {
      logger.error('❌ Baseline creation failed', {
        projectId: req.params.projectId,
        error: error.message
      })
      next(error)
    }
  }
)

/**
 * GET /api/entities/baselines/project/:projectId
 * Get all baselines for a project
 */
router.get(
  '/baselines/project/:projectId',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params
      const filters: any = {}

      if (req.query.baselineType) {
        filters.baselineType = req.query.baselineType as string
      }
      if (req.query.status) {
        filters.status = req.query.status as string
      }

      const baselines = await entityBaselineService.getProjectBaselines(projectId, filters)

      res.json({
        success: true,
        data: baselines,
        count: baselines.length
      })
    } catch (error: any) {
      next(error)
    }
  }
)

/**
 * GET /api/entities/baselines/:baselineId
 * Get baseline by ID
 */
router.get(
  '/baselines/:baselineId',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { baselineId } = req.params

      const baseline = await entityBaselineService.getBaseline(baselineId)

      if (!baseline) {
        return res.status(404).json({
          success: false,
          error: 'Baseline not found'
        })
      }

      res.json({
        success: true,
        data: baseline
      })
    } catch (error: any) {
      next(error)
    }
  }
)

/**
 * POST /api/entities/baselines/:baselineId/compare
 * Compare current state to baseline
 */
router.post(
  '/baselines/:baselineId/compare',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { baselineId } = req.params
      const userId = (req as any).user?.id

      const comparison = await entityBaselineService.compareToBaseline(baselineId, userId)

      res.json({
        success: true,
        data: comparison
      })
    } catch (error: any) {
      logger.error('❌ Baseline comparison failed', {
        baselineId: req.params.baselineId,
        error: error.message
      })
      next(error)
    }
  }
)

/**
 * POST /api/entities/baselines/:baselineId1/compare/:baselineId2
 * Compare two baselines
 */
router.post(
  '/baselines/:baselineId1/compare/:baselineId2',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { baselineId1, baselineId2 } = req.params
      const userId = (req as any).user?.id

      const comparison = await entityBaselineService.compareBaselines(baselineId1, baselineId2, userId)

      res.json({
        success: true,
        data: comparison
      })
    } catch (error: any) {
      next(error)
    }
  }
)

/**
 * POST /api/entities/baselines/:baselineId/approve
 * Approve a baseline
 */
router.post(
  '/baselines/:baselineId/approve',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { baselineId } = req.params
      const userId = (req as any).user?.id

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        })
      }

      await entityBaselineService.approveBaseline(baselineId, userId)

      res.json({
        success: true,
        message: 'Baseline approved'
      })
    } catch (error: any) {
      next(error)
    }
  }
)

/**
 * POST /api/entities/baselines/:baselineId/archive
 * Archive a baseline
 */
router.post(
  '/baselines/:baselineId/archive',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { baselineId } = req.params

      await entityBaselineService.archiveBaseline(baselineId)

      res.json({
        success: true,
        message: 'Baseline archived'
      })
    } catch (error: any) {
      next(error)
    }
  }
)

// ============================================================================
// Drift Detection Routes
// ============================================================================

/**
 * POST /api/entities/drift/detect/project/:projectId
 * Detect drift for a project
 */
router.post(
  '/drift/detect/project/:projectId',
  authenticateToken,
  validate(Joi.object({
    baselineId: Joi.string().uuid().optional(),
    autoCreateJiraIssue: Joi.boolean().default(false),
    autoUpdateConfluence: Joi.boolean().default(false),
    minSeverity: Joi.string().valid('info', 'warning', 'critical').optional()
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params
      const options = req.body || {}

      const drifts = await entityDriftDetectionService.detectDrift(projectId, options)

      res.json({
        success: true,
        data: drifts,
        count: drifts.length
      })
    } catch (error: any) {
      logger.error('❌ Drift detection failed', {
        projectId: req.params.projectId,
        error: error.message
      })
      next(error)
    }
  }
)

/**
 * GET /api/entities/drift/project/:projectId
 * Get drift detections for a project
 */
router.get(
  '/drift/project/:projectId',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params
      const filters: any = {}

      if (req.query.driftType) {
        filters.driftType = req.query.driftType as string
      }
      if (req.query.severity) {
        filters.severity = req.query.severity as string
      }
      if (req.query.status) {
        filters.status = req.query.status as string
      }

      if (req.query.limit) {
        filters.limit = Number(req.query.limit)
      }
      if (req.query.offset) {
        filters.offset = Number(req.query.offset)
      }

      const drifts = await entityDriftDetectionService.getProjectDrifts(projectId, filters)

      res.json({
        success: true,
        data: drifts,
        count: drifts.length,
        limit: filters.limit,
        offset: filters.offset
      })
    } catch (error: any) {
      next(error)
    }
  }
)

/**
 * POST /api/entities/drift/:driftId/resolve
 * Resolve a drift detection
 */
router.post(
  '/drift/:driftId/resolve',
  authenticateToken,
  validate(Joi.object({
    resolutionAction: Joi.string().valid('accept', 'revert', 'adjust', 'ignore').required(),
    resolutionNotes: Joi.string().optional()
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { driftId } = req.params
      const { resolutionAction, resolutionNotes } = req.body
      const userId = (req as any).user?.id

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        })
      }

      await entityDriftDetectionService.resolveDrift(
        driftId,
        userId,
        resolutionAction,
        resolutionNotes
      )

      res.json({
        success: true,
        message: 'Drift resolved'
      })
    } catch (error: any) {
      next(error)
    }
  }
)

export default router
