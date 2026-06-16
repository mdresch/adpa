/**
 * Approval Workflow API Routes
 * TASK-745: Approval workflow integration
 * 
 * REST API endpoints for managing approval workflows
 */

import express from 'express'
import { logger } from '../utils/logger'
import { approvalWorkflowService } from '../services/approvalWorkflowService'
import { authenticateToken } from '../middleware/auth'
import { pool } from '../database/connection'

const router = express.Router()

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Ensure user is authenticated
router.use(authenticateToken)

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/approvals
 * Get approvals for the current user
 * Query params:
 *   - status: Filter by status (pending, in_progress, approved, rejected, all)
 */
router.get('/', async (req, res) => {
  try {
    const userId = (req as any).user?.id
    const { status } = req.query

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    logger.info('[APPROVAL-API] Fetching approvals', { userId, status })

    let approvals = await approvalWorkflowService.getPendingApprovalsForUser(userId)

    // Apply status filter if provided
    if (status && status !== 'all') {
      if (status === 'pending') {
        approvals = approvals.filter(a => a.status === 'pending' || a.status === 'in_progress')
      } else {
        approvals = approvals.filter(a => a.status === status)
      }
    }

    res.json({
      success: true,
      approvals,
      count: approvals.length
    })
  } catch (error) {
    logger.error('[APPROVAL-API] Error fetching approvals:', error)
    res.status(500).json({ 
      error: 'Failed to fetch approvals',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /api/approvals/:id
 * Get a specific approval request
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    logger.info('[APPROVAL-API] Fetching approval request', { id })

    const approval = await approvalWorkflowService.getApprovalRequest(id)

    if (!approval) {
      return res.status(404).json({ error: 'Approval request not found' })
    }

    // Get approval steps
    const steps = await approvalWorkflowService.getApprovalSteps(id)

    res.json({
      success: true,
      approval,
      steps
    })
  } catch (error) {
    logger.error('[APPROVAL-API] Error fetching approval request:', error)
    res.status(500).json({ 
      error: 'Failed to fetch approval request',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * POST /api/approvals
 * Create a new approval request
 */
router.post('/', async (req, res) => {
  try {
    const userId = (req as any).user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const {
      request_type,
      change_request_id,
      drift_record_id,
      project_id,
      title,
      description,
      impact_summary,
      priority,
      severity,
      metadata
    } = req.body

    // Validate required fields
    if (!request_type || !project_id || !title || !description) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['request_type', 'project_id', 'title', 'description']
      })
    }

    logger.info('[APPROVAL-API] Creating approval request', {
      request_type,
      project_id,
      userId
    })

    // 🛡️ DRACO GOVERNANCE CHECK
    // If this is a document approval (linked via change_request_id), check DRACO status
    if (change_request_id) {
      const { dracoService } = await Promise.resolve().then(() => require('../services/dracoService'))
      const latestReview = await dracoService.getDocumentReview(change_request_id)

      if (latestReview && 
          latestReview.verdict === 'REJECT' && 
          latestReview.publication_advisory.blocking_enabled) {
        
        // Check if there is an override
        const overrideResult = await pool.query(
          `SELECT id FROM documents WHERE id = $1 AND draco_override_id IS NOT NULL`,
          [change_request_id]
        )

        if (overrideResult.rows.length === 0) {
          logger.warn('[DRACO-BLOCK] 🚫 Approval blocked by DRACO governance', {
            documentId: change_request_id,
            reviewId: latestReview.review_id
          })
          return res.status(403).json({
            success: false,
            error: 'DRACO_GOVERNANCE_BLOCK',
            message: 'DRACO AI Review Board has REJECTED this document. A formal Human Override is required before this document can be sent for approval.',
            review_id: latestReview.review_id,
            remediation_steps: latestReview.remediation_steps
          })
        }
        
        logger.info('[DRACO-BLOCK] 🛡️ Approval allowed via Human Override', {
          documentId: change_request_id,
          overrideId: overrideResult.rows[0].id
        })
      }
    }

    const approvalRequest = await approvalWorkflowService.createApprovalRequest({
      request_type,
      change_request_id,
      drift_record_id,
      project_id,
      title,
      description,
      impact_summary,
      priority,
      severity,
      requested_by: userId,
      metadata
    })

    res.status(201).json({
      success: true,
      approval_request: approvalRequest
    })
  } catch (error) {
    logger.error('[APPROVAL-API] Error creating approval request:', error)
    res.status(500).json({ 
      error: 'Failed to create approval request',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * POST /api/approvals/:id/steps/:stepId/approve
 * Approve an approval step
 */
router.post('/:id/steps/:stepId/approve', async (req, res) => {
  try {
    const userId = (req as any).user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { stepId } = req.params
    const { decision_notes, conditions } = req.body

    logger.info('[APPROVAL-API] Approving step', { stepId, userId })

    const approvalRequest = await approvalWorkflowService.processApprovalStep({
      approval_step_id: stepId,
      approver_user_id: userId,
      decision: 'approved',
      decision_notes,
      conditions
    })

    res.json({
      success: true,
      approval_request: approvalRequest,
      message: 'Approval step approved successfully'
    })
  } catch (error) {
    logger.error('[APPROVAL-API] Error approving step:', error)
    res.status(500).json({ 
      error: 'Failed to approve step',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * POST /api/approvals/:id/steps/:stepId/reject
 * Reject an approval step
 */
router.post('/:id/steps/:stepId/reject', async (req, res) => {
  try {
    const userId = (req as any).user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { stepId } = req.params
    const { decision_notes } = req.body

    if (!decision_notes) {
      return res.status(400).json({ 
        error: 'Decision notes are required when rejecting'
      })
    }

    logger.info('[APPROVAL-API] Rejecting step', { stepId, userId })

    const approvalRequest = await approvalWorkflowService.processApprovalStep({
      approval_step_id: stepId,
      approver_user_id: userId,
      decision: 'rejected',
      decision_notes
    })

    res.json({
      success: true,
      approval_request: approvalRequest,
      message: 'Approval step rejected'
    })
  } catch (error) {
    logger.error('[APPROVAL-API] Error rejecting step:', error)
    res.status(500).json({ 
      error: 'Failed to reject step',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /api/approvals/project/:projectId
 * Get all approval requests for a project
 */
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params
    const { status } = req.query

    logger.info('[APPROVAL-API] Fetching project approvals', { projectId, status })

    const query = status
      ? `SELECT * FROM approval_requests WHERE project_id = $1 AND status = $2 ORDER BY created_at DESC`
      : `SELECT * FROM approval_requests WHERE project_id = $1 ORDER BY created_at DESC`

    const params = status ? [projectId, status] : [projectId]

    const result = await pool.query(query, params)

    res.json({
      success: true,
      approvals: result.rows,
      count: result.rows.length
    })
  } catch (error) {
    logger.error('[APPROVAL-API] Error fetching project approvals:', error)
    res.status(500).json({ 
      error: 'Failed to fetch project approvals',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /api/approvals/stats
 * Get approval statistics for the current user
 */
router.get('/stats/user', async (req, res) => {
  try {
    const userId = (req as any).user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    logger.info('[APPROVAL-API] Fetching user approval stats', { userId })

    const result = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE astep.status = 'pending') as pending,
        COUNT(*) FILTER (WHERE astep.status = 'approved') as approved,
        COUNT(*) FILTER (WHERE astep.status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE ar.sla_deadline < NOW() AND ar.status IN ('pending', 'in_progress')) as overdue
       FROM approval_steps astep
       JOIN approval_requests ar ON astep.approval_request_id = ar.id
       WHERE astep.approver_user_id = $1`,
      [userId]
    )

    res.json({
      success: true,
      stats: result.rows[0]
    })
  } catch (error) {
    logger.error('[APPROVAL-API] Error fetching user approval stats:', error)
    res.status(500).json({ 
      error: 'Failed to fetch approval stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router
