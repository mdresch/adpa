/**
 * Baseline Routes
 * CR-2026-001: Project Baseline & Drift Detection System
 */

import express from 'express'
import Joi from 'joi'
import { authenticateToken, requirePermission } from '../middleware/auth'
import { validate, validateQuery } from '../middleware/validation'
import { baselineService } from '../services/baselineService'
import { logger } from '../utils/logger'

const router = express.Router()

/**
 * GET /api/baselines/project/:projectId
 * Get all baselines for a project
 */
router.get(
  '/project/:projectId',
  authenticateToken,
  requirePermission('projects.view'),
  async (req, res) => {
    try {
      const { projectId } = req.params
      const { pool } = await import('../database/connection')

      const result = await pool.query(
        `SELECT 
          pb.*,
          u1.name as created_by_name,
          u2.name as approved_by_name,
          (SELECT COUNT(*) FROM baseline_drift_detection WHERE baseline_id = pb.id) as drift_count
        FROM project_baselines pb
        LEFT JOIN users u1 ON pb.created_by = u1.id
        LEFT JOIN users u2 ON pb.approved_by = u2.id
        WHERE pb.project_id = $1
        ORDER BY pb.created_at DESC`,
        [projectId]
      )

      res.json({ baselines: result.rows })
    } catch (error) {
      logger.error('Error fetching project baselines:', error)
      res.status(500).json({ error: 'Failed to fetch baselines' })
    }
  }
)

/**
 * GET /api/baselines/project/:projectId/active
 * Get active baseline for a project
 */
router.get(
  '/project/:projectId/active',
  authenticateToken,
  requirePermission('projects.view'),
  async (req, res) => {
    try {
      const { projectId } = req.params
      const baseline = await baselineService.getActiveBaseline(projectId)

      if (!baseline) {
        return res.status(404).json({ error: 'No active baseline found for this project' })
      }

      res.json({ baseline })
    } catch (error) {
      logger.error('Error fetching active baseline:', error)
      res.status(500).json({ error: 'Failed to fetch active baseline' })
    }
  }
)

/**
 * GET /api/baselines/:id
 * Get a specific baseline by ID
 */
router.get(
  '/:id',
  authenticateToken,
  requirePermission('projects.view'),
  async (req, res) => {
    try {
      const { id } = req.params
      const { pool } = await import('../database/connection')

      const result = await pool.query(
        `SELECT 
          pb.*,
          u1.name as created_by_name,
          u2.name as approved_by_name
        FROM project_baselines pb
        LEFT JOIN users u1 ON pb.created_by = u1.id
        LEFT JOIN users u2 ON pb.approved_by = u2.id
        WHERE pb.id = $1`,
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Baseline not found' })
      }

      res.json({ baseline: result.rows[0] })
    } catch (error) {
      logger.error('Error fetching baseline:', error)
      res.status(500).json({ error: 'Failed to fetch baseline' })
    }
  }
)

/**
 * POST /api/baselines/extract
 * Extract baseline from project document corpus
 */
router.post(
  '/extract',
  authenticateToken,
  requirePermission('baselines.create'),
  validate(
    Joi.object({
      project_id: Joi.string().uuid().required(),
      document_ids: Joi.array().items(Joi.string().uuid()).optional(),
      ai_provider: Joi.string().optional(),
      ai_model: Joi.string().optional()
    })
  ),
  async (req, res) => {
    try {
      const { project_id, document_ids, ai_provider, ai_model } = req.body
      const userId = (req as any).user.id

      logger.info(`Extracting baseline for project ${project_id}`)

      // Extract baseline using AI
      const extractionResult = await baselineService.extractBaselineFromCorpus(
        project_id,
        userId,
        {
          includeDocumentIds: document_ids,
          aiProvider: ai_provider,
          aiModel: ai_model
        }
      )

      // Create baseline in database
      const corpus = document_ids || (await baselineService.getProjectDocumentCorpus(project_id)).map(d => d.id)
      const baseline = await baselineService.createBaseline(
        project_id,
        userId,
        extractionResult,
        corpus
      )

      res.json({
        success: true,
        baseline,
        message: 'Baseline extracted successfully'
      })
    } catch (error: any) {
      logger.error('Error extracting baseline:', error)
      res.status(500).json({ error: error.message || 'Failed to extract baseline' })
    }
  }
)

/**
 * POST /api/baselines/:id/approve
 * Approve a baseline and set it as active
 */
router.post(
  '/:id/approve',
  authenticateToken,
  requirePermission('baselines.approve'),
  async (req, res) => {
    try {
      const { id } = req.params
      const userId = (req as any).user.id

      const baseline = await baselineService.approveBaseline(id, userId)

      res.json({
        success: true,
        baseline,
        message: 'Baseline approved and activated'
      })
    } catch (error: any) {
      logger.error('Error approving baseline:', error)
      res.status(500).json({ error: error.message || 'Failed to approve baseline' })
    }
  }
)

/**
 * GET /api/baselines/:id/drift
 * Get drift detections for a baseline
 */
router.get(
  '/:id/drift',
  authenticateToken,
  requirePermission('projects.view'),
  validateQuery(
    Joi.object({
      severity: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
      status: Joi.string().valid('detected', 'acknowledged', 'investigating', 'resolved', 'false_positive').optional(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20)
    })
  ),
  async (req, res) => {
    try {
      const { id } = req.params
      const { severity, status, page = 1, limit = 20 } = req.query
      const { pool } = await import('../database/connection')

      const offset = (Number(page) - 1) * Number(limit)

      let query = `
        SELECT 
          bdd.*,
          d.title as document_title,
          u.name as assigned_to_name
        FROM baseline_drift_detection bdd
        LEFT JOIN documents d ON bdd.source_document_id = d.id
        LEFT JOIN users u ON bdd.assigned_to = u.id
        WHERE bdd.baseline_id = $1
      `
      const params: any[] = [id]
      let paramCount = 1

      if (severity) {
        paramCount++
        query += ` AND bdd.drift_severity = $${paramCount}`
        params.push(severity)
      }

      if (status) {
        paramCount++
        query += ` AND bdd.status = $${paramCount}`
        params.push(status)
      }

      query += ` ORDER BY bdd.detection_date DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
      params.push(limit, offset)

      const result = await pool.query(query, params)

      // Get total count
      let countQuery = `SELECT COUNT(*) FROM baseline_drift_detection WHERE baseline_id = $1`
      const countParams: any[] = [id]
      if (severity) countQuery += ` AND drift_severity = $2`
      if (status) {
        countQuery += ` AND status = $${countParams.length + 1}`
        countParams.push(status)
      }
      const countResult = await pool.query(countQuery, countParams)
      const total = parseInt(countResult.rows[0].count)

      res.json({
        drifts: result.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      })
    } catch (error) {
      logger.error('Error fetching baseline drift:', error)
      res.status(500).json({ error: 'Failed to fetch drift detections' })
    }
  }
)

/**
 * POST /api/baselines/validate-document
 * Validate a document against project baseline
 */
router.post(
  '/validate-document',
  authenticateToken,
  requirePermission('projects.view'),
  validate(
    Joi.object({
      project_id: Joi.string().uuid().required(),
      document_id: Joi.string().uuid().required(),
      document_content: Joi.string().required(),
      document_title: Joi.string().required()
    })
  ),
  async (req, res) => {
    try {
      const { project_id, document_id, document_content, document_title } = req.body

      const drifts = await baselineService.validateDocumentAgainstBaseline(
        project_id,
        document_id,
        document_content,
        document_title
      )

      res.json({
        success: true,
        drifts,
        has_drift: drifts.length > 0,
        drift_count: drifts.length
      })
    } catch (error: any) {
      logger.error('Error validating document:', error)
      res.status(500).json({ error: error.message || 'Failed to validate document' })
    }
  }
)

/**
 * GET /api/baselines/project/:projectId/summary
 * Get baseline summary with drift statistics
 */
router.get(
  '/project/:projectId/summary',
  authenticateToken,
  requirePermission('projects.view'),
  async (req, res) => {
    try {
      const { projectId } = req.params
      const { pool } = await import('../database/connection')

      // Get active baseline
      const baseline = await baselineService.getActiveBaseline(projectId)

      if (!baseline) {
        return res.json({
          has_baseline: false,
          baseline: null,
          drift_summary: null
        })
      }

      // Get drift statistics
      const driftStats = await pool.query(
        `SELECT 
          detection_type,
          drift_severity,
          status,
          COUNT(*) as count
        FROM baseline_drift_detection
        WHERE baseline_id = $1
        GROUP BY detection_type, drift_severity, status`,
        [baseline.id]
      )

      res.json({
        has_baseline: true,
        baseline: {
          id: baseline.id,
          version: baseline.version,
          status: baseline.status,
          created_at: baseline.created_at,
          approved_at: baseline.approved_at,
          extraction_confidence: baseline.extraction_confidence,
          completeness_score: baseline.completeness_score
        },
        drift_summary: {
          total_detections: driftStats.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
          by_type: driftStats.rows,
          critical_count: driftStats.rows
            .filter(r => r.drift_severity === 'critical')
            .reduce((sum, row) => sum + parseInt(row.count), 0),
          unresolved_count: driftStats.rows
            .filter(r => r.status === 'detected' || r.status === 'acknowledged')
            .reduce((sum, row) => sum + parseInt(row.count), 0)
        }
      })
    } catch (error) {
      logger.error('Error fetching baseline summary:', error)
      res.status(500).json({ error: 'Failed to fetch baseline summary' })
    }
  }
)

export default router
