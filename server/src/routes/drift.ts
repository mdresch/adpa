/**
 * Drift Detection & Resolution Routes
 * CR-2026-001: Automatic Drift Detection & Resolution
 */

import express from 'express'
import Joi from 'joi'
import { authenticateToken, requirePermission } from '../middleware/auth'
import { validate } from '../middleware/validation'
import { driftDetectionService } from '../services/driftDetectionService'
import { driftResolutionService, DriftApplyResponse } from '../services/driftResolutionService'
import { positiveDriftChangeRequestService } from '../services/positiveDriftChangeRequestService'
import { logger } from '../utils/logger'

const router = express.Router()

/**
 * POST /api/drift/check
 * Manually trigger drift detection for a document
 */
router.post(
  '/check',
  authenticateToken,
  requirePermission('documents.update'),
  validate(
    Joi.object({
      projectId: Joi.string().uuid().required(),
      documentId: Joi.string().uuid().required()
    })
  ),
  async (req, res) => {
    try {
      const { projectId, documentId } = req.body

      logger.info('[DRIFT-API] Manual drift check requested', {
        projectId,
        documentId,
        userId: req.user?.id
      })

      const result = await driftDetectionService.checkForDrift(projectId, documentId)

      res.json({
        success: true,
        driftDetected: result.hasDrift,
        severity: result.severity,
        driftCount: result.driftPoints.length,
        summary: result.summary,
        driftPoints: result.driftPoints
      })
    } catch (error) {
      logger.error('[DRIFT-API] Error checking drift:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to check for drift'
      })
    }
  }
)

/**
 * POST /api/drift/analyze-positive
 * Analyze drift points for positive drift and auto-generate opportunity CR
 */
router.post(
  '/analyze-positive',
  authenticateToken,
  requirePermission('documents.update'),
  validate(
    Joi.object({
      projectId: Joi.string().uuid().required(),
      documentId: Joi.string().uuid().required(),
      driftRecordId: Joi.string().uuid().required(),
      driftPoints: Joi.array().items(Joi.object()).required(),
      forceGenerate: Joi.boolean().optional().default(false) // Allow forcing business case generation
    })
  ),
  async (req, res) => {
    try {
      const { projectId, documentId, driftRecordId, driftPoints, forceGenerate } = req.body
      const userId = req.user?.id

      logger.info('[DRIFT-API] Analyzing for positive drift', {
        projectId,
        documentId,
        driftRecordId,
        driftPointsCount: driftPoints.length,
        forceGenerate
      })

      // Analyze drift for positive indicators
      let positiveDrift = positiveDriftChangeRequestService.analyzePositiveDrift(driftPoints)

      // If no positive drift detected but forceGenerate is true, create a generic positive drift classification
      if (!positiveDrift.isPositive && forceGenerate) {
        logger.info('[DRIFT-API] No positive drift detected, but forceGenerate=true. Creating generic business case opportunity.')
        
        // Create a generic positive drift classification for business case generation
        positiveDrift = {
          isPositive: true,
          driftCategory: 'efficiency',
          metrics: {
            efficiencyGain: 5, // Estimate 5% efficiency gain
            innovationValue: 10000 // Estimated value
          },
          description: 'Business case opportunity identified from drift analysis',
          strategicValue: 'Potential strategic value identified through drift analysis. Further analysis recommended.'
        }
      }

      if (!positiveDrift.isPositive) {
        return res.json({
          success: true,
          isPositiveDrift: false,
          message: 'No positive drift detected. Set forceGenerate=true to generate a business case anyway.',
          driftPointsCount: driftPoints.length
        })
      }

      // Auto-generate opportunity change request
      const crResult = await positiveDriftChangeRequestService.generateOpportunityCR(
        projectId,
        documentId,
        driftRecordId,
        driftPoints,
        positiveDrift,
        userId!
      )

      res.json({
        success: true,
        isPositiveDrift: true,
        positiveDrift,
        changeRequest: crResult,
        message: 'Business case generated successfully'
      })
    } catch (error) {
      logger.error('[DRIFT-API] Error analyzing positive drift:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to analyze positive drift',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
)

/**
 * POST /api/drift/resolve
 * Generate AI-powered resolution for drift
 */
router.post(
  '/resolve',
  authenticateToken,
  requirePermission('documents.update'),
  validate(
    Joi.object({
      documentId: Joi.string().uuid().required(),
      driftRecordId: Joi.string().uuid().required(),
      strategy: Joi.string().valid('conservative', 'balanced', 'permissive').default('balanced')
    })
  ),
  async (req, res) => {
    try {
      const { documentId, driftRecordId, strategy } = req.body
      const userId = req.user?.id

      logger.info('[DRIFT-API] Resolution requested', {
        documentId,
        driftRecordId,
        strategy,
        userId
      })

      const result = await driftResolutionService.resolveDrift(
        documentId,
        driftRecordId,
        userId!,
        strategy || 'balanced'
      )

      res.json({
        success: true,
        resolvedContent: result.resolvedContent,
        originalContent: result.originalContent,
        driftPoints: result.driftPoints,
        majorChanges: result.majorChanges,
        requiresApproval: result.requiresApproval,
        strategy: result.strategy,
        previewHtml: result.previewHtml
      })
    } catch (error) {
      logger.error('[DRIFT-API] Error generating resolution:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to generate drift resolution'
      })
    }
  }
)

/**
 * POST /api/drift/apply
 * Apply drift resolution to document
 */
router.post(
  '/apply',
  authenticateToken,
  requirePermission('documents.update'),
  validate(
    Joi.object({
      documentId: Joi.string().uuid().required(),
      driftRecordId: Joi.string().uuid().required(),
      resolvedContent: Joi.string().required(),
      majorChanges: Joi.array().items(Joi.object()).optional()
    })
  ),
  async (req, res) => {
    try {
      const { documentId, driftRecordId, resolvedContent, majorChanges } = req.body
      const userId = req.user?.id

      logger.info('[DRIFT-API] Applying resolution', {
        documentId,
        driftRecordId,
        userId,
        hasMajorChanges: !!majorChanges && majorChanges.length > 0
      })

      const result = await driftResolutionService.applyResolution(
        documentId,
        resolvedContent,
        driftRecordId,
        userId!,
        majorChanges
      )

      const response: DriftApplyResponse = {
        success: true,
        message: 'Drift resolution applied successfully'
      }

      // Add change request info if one was created
      if (result.changeRequestId) {
        response.changeRequestCreated = true
        response.changeRequestId = result.changeRequestId
        response.message = 'Drift resolution applied successfully. Change request created for major changes requiring approval.'
      }

      res.json(response)
    } catch (error) {
      logger.error('[DRIFT-API] Error applying resolution:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to apply drift resolution'
      })
    }
  }
)

/**
 * GET /api/drift/:driftRecordId
 * Get drift record details
 */
router.get(
  '/:driftRecordId',
  authenticateToken,
  requirePermission('projects.view'),
  async (req, res) => {
    try {
      const { driftRecordId } = req.params

      const { pool } = await Promise.resolve().then(() => require())
      const result = await pool.query(
        `SELECT 
          bdd.*,
          d.title as document_title,
          pb.version as baseline_version
        FROM baseline_drift_detection bdd
        LEFT JOIN documents d ON bdd.source_document_id = d.id
        LEFT JOIN project_baselines pb ON bdd.baseline_id = pb.id
        WHERE bdd.id = $1`,
        [driftRecordId]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Drift record not found'
        })
      }

      res.json({
        success: true,
        driftRecord: result.rows[0]
      })
    } catch (error) {
      logger.error('[DRIFT-API] Error fetching drift record:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch drift record'
      })
    }
  }
)

/**
 * GET /api/drift/project/:projectId
 * Get all drift records for a project
 */
router.get(
  '/project/:projectId',
  authenticateToken,
  requirePermission('projects.view'),
  async (req, res) => {
    try {
      const { projectId } = req.params
      const { status } = req.query

      const { pool } = await Promise.resolve().then(() => require())
      
      let query = `
        SELECT 
          bdd.*,
          d.title as document_title,
          pb.version as baseline_version
        FROM baseline_drift_detection bdd
        LEFT JOIN documents d ON bdd.source_document_id = d.id
        LEFT JOIN project_baselines pb ON bdd.baseline_id = pb.id
        WHERE bdd.project_id = $1
      `
      
      const params: any[] = [projectId]
      
      if (status) {
        query += ` AND bdd.status = $2`
        params.push(status)
      }
      
      query += ` ORDER BY bdd.detection_date DESC`

      const result = await pool.query(query, params)

      res.json({
        success: true,
        driftRecords: result.rows
      })
    } catch (error) {
      logger.error('[DRIFT-API] Error fetching project drift records:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch drift records'
      })
    }
  }
)

export default router
