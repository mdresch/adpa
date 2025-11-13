/**
 * Project Similarity and Replication Routes
 * TASK-748: Replication to similar projects
 */

import express from 'express'
import { authenticateToken } from '../middleware/auth'
import { logger, childLogger } from '../utils/logger'
import projectSimilarityService from '../services/projectSimilarityService'
import { pool } from '../database/connection'

const router = express.Router()

/**
 * GET /api/projects/:projectId/similar
 * Find similar projects for a given project
 */
router.get('/:projectId/similar', authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { projectId } = req.params
    const { minScore = 0.5 } = req.query

    log.info('Getting similar projects', { projectId, minScore })

    const similarProjects = await projectSimilarityService.findSimilarProjects(
      projectId,
      parseFloat(minScore as string)
    )

    res.json({
      projectId,
      similarProjects,
      count: similarProjects.length
    })
  } catch (error) {
    log.error('Get similar projects error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/projects/:projectId/detect-similar
 * Detect and store similar projects
 */
router.post('/:projectId/detect-similar', authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { projectId } = req.params
    const { minScore = 0.5 } = req.body

    log.info('Detecting similar projects', { projectId, minScore })

    const similarities = await projectSimilarityService.detectAndStoreSimilarProjects(
      projectId,
      minScore
    )

    res.json({
      projectId,
      detected: similarities.length,
      similarities
    })
  } catch (error) {
    log.error('Detect similar projects error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/projects/:projectId/similarity/:otherProjectId
 * Calculate similarity between two projects
 */
router.get('/:projectId/similarity/:otherProjectId', authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { projectId, otherProjectId } = req.params

    log.info('Calculating project similarity', { projectId, otherProjectId })

    const similarityScore = await projectSimilarityService.calculateSimilarity(
      projectId,
      otherProjectId
    )

    res.json({
      projectId,
      otherProjectId,
      similarityScore
    })
  } catch (error) {
    log.error('Calculate similarity error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/projects/:projectId/replications/source
 * Get replications where this project is the source
 */
router.get('/:projectId/replications/source', authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { projectId } = req.params

    log.info('Getting source replications', { projectId })

    const replications = await projectSimilarityService.getReplicationsForSource(projectId)

    res.json({
      projectId,
      replications,
      count: replications.length
    })
  } catch (error) {
    log.error('Get source replications error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/projects/:projectId/replications/target
 * Get replications where this project is the target
 */
router.get('/:projectId/replications/target', authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { projectId } = req.params

    log.info('Getting target replications', { projectId })

    const replications = await projectSimilarityService.getReplicationsForTarget(projectId)

    res.json({
      projectId,
      replications,
      count: replications.length
    })
  } catch (error) {
    log.error('Get target replications error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/projects/:projectId/replications
 * Create a replication to apply an improvement to a similar project
 */
router.post('/:projectId/replications', authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { projectId } = req.params
    const {
      targetProjectId,
      improvementType,
      improvementTitle,
      improvementDescription,
      estimatedValue,
      sourceDriftId,
      sourceInnovationId
    } = req.body

    // Validation
    if (!targetProjectId || !improvementType || !improvementTitle || !improvementDescription) {
      return res.status(400).json({
        error: 'Missing required fields: targetProjectId, improvementType, improvementTitle, improvementDescription'
      })
    }

    log.info('Creating replication', {
      sourceProjectId: projectId,
      targetProjectId,
      improvementTitle
    })

    const replication = await projectSimilarityService.createReplication({
      sourceProjectId: projectId,
      targetProjectId,
      improvementType,
      improvementTitle,
      improvementDescription,
      estimatedValue,
      sourceDriftId,
      sourceInnovationId,
      assignedTo: (req as any).user?.id
    })

    res.status(201).json(replication)
  } catch (error: any) {
    log.error('Create replication error:', error)
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'A replication for this improvement already exists for the target project'
      })
    }
    
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * PATCH /api/replications/:replicationId/status
 * Update replication status
 */
router.patch('/replications/:replicationId/status', authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { replicationId } = req.params
    const { status, notes } = req.body

    if (!status) {
      return res.status(400).json({ error: 'Status is required' })
    }

    const validStatuses = [
      'identified', 'pending_approval', 'approved', 'in_progress',
      'completed', 'verified', 'rejected', 'failed'
    ]

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      })
    }

    log.info('Updating replication status', { replicationId, status })

    const replication = await projectSimilarityService.updateReplicationStatus(
      replicationId,
      status,
      (req as any).user?.id,
      notes
    )

    res.json(replication)
  } catch (error: any) {
    log.error('Update replication status error:', error)
    
    if (error.message === 'Replication not found') {
      return res.status(404).json({ error: 'Replication not found' })
    }
    
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/projects/:projectId/value-tracking
 * Get value tracking for improvements from this project
 */
router.get('/:projectId/value-tracking', authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { projectId } = req.params

    log.info('Getting value tracking', { projectId })

    const valueTracking = await projectSimilarityService.getValueTracking(projectId)

    res.json({
      projectId,
      improvements: valueTracking,
      count: valueTracking.length
    })
  } catch (error) {
    log.error('Get value tracking error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/projects/replications/change-request/:changeRequestId
 * Get replication opportunities for a change request
 * TASK-748: Replication to similar projects
 */
router.get('/replications/change-request/:changeRequestId', authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { changeRequestId } = req.params

    log.info('Getting replication opportunities for change request', { changeRequestId })

    // Get change request document
    const crResult = await pool.query(
      `SELECT id, project_id, metadata, name
       FROM documents
       WHERE id = $1 AND type = 'change_request'`,
      [changeRequestId]
    )

    if (crResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Change request not found'
      })
    }

    const cr = crResult.rows[0]
    const metadata = cr.metadata || {}
    const replicationInfo = metadata.replication || {}

    // Get replication records for this change request
    const replications = await projectSimilarityService.getReplicationsForSource(cr.project_id)

    // Filter replications that match this change request's drift record
    const relevantReplications = replications.filter(r => {
      const crDriftId = metadata.drift_record_id
      return !crDriftId || r.source_drift_id === crDriftId
    })

    res.json({
      changeRequestId,
      projectId: cr.project_id,
      changeRequestTitle: cr.name,
      replication: {
        similarProjectsFound: replicationInfo.similar_projects_found || 0,
        replicationRecordsCreated: replicationInfo.replication_records_created || 0,
        similarProjectIds: replicationInfo.similar_project_ids || [],
        replicationPotential: replicationInfo.replication_potential || 0
      },
      replications: relevantReplications,
      count: relevantReplications.length
    })
  } catch (error) {
    log.error('Get replication opportunities error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/projects/replications/change-request/:changeRequestId/execute
 * Execute replication to similar projects from an approved change request
 * TASK-748: Replication to similar projects
 */
router.post('/replications/change-request/:changeRequestId/execute', authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { changeRequestId } = req.params
    const { targetProjectIds } = req.body
    const userId = (req as any).user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    log.info('Executing replication from change request', {
      changeRequestId,
      targetProjectIds: targetProjectIds?.length || 'all'
    })

    // Get change request document
    const crResult = await pool.query(
      `SELECT id, project_id, metadata, name, content
       FROM documents
       WHERE id = $1 AND type = 'change_request'`,
      [changeRequestId]
    )

    if (crResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Change request not found'
      })
    }

    const cr = crResult.rows[0]
    const metadata = cr.metadata || {}
    const replicationInfo = metadata.replication || {}

    // Verify change request is approved
    const statusResult = await pool.query(
      `SELECT status FROM documents WHERE id = $1`,
      [changeRequestId]
    )

    if (statusResult.rows[0]?.status !== 'approved') {
      return res.status(400).json({
        error: 'Change request must be approved before replication can be executed',
        currentStatus: statusResult.rows[0]?.status
      })
    }

    // Get replication records
    let replications = await projectSimilarityService.getReplicationsForSource(cr.project_id)

    // Filter by drift record if available
    const crDriftId = metadata.drift_record_id
    if (crDriftId) {
      replications = replications.filter(r => r.source_drift_id === crDriftId)
    }

    // Filter by target project IDs if provided
    if (targetProjectIds && Array.isArray(targetProjectIds) && targetProjectIds.length > 0) {
      replications = replications.filter(r => targetProjectIds.includes(r.target_project_id))
    }

    if (replications.length === 0) {
      return res.status(404).json({
        error: 'No replication opportunities found for this change request',
        suggestion: 'Ensure similar projects have been identified and replication records created'
      })
    }

    // Update replication statuses to 'approved' or 'in_progress'
    const executedReplications = []
    for (const replication of replications) {
      try {
        // Update status based on current status
        const newStatus = replication.replication_status === 'identified' 
          ? 'approved' 
          : replication.replication_status === 'pending_approval'
          ? 'in_progress'
          : 'in_progress'

        const updated = await projectSimilarityService.updateReplicationStatus(
          replication.id,
          newStatus,
          userId,
          `Replication executed from approved change request ${changeRequestId}`
        )

        executedReplications.push(updated)
      } catch (error: any) {
        log.error('Error updating replication status', {
          replicationId: replication.id,
          error: error.message
        })
        // Continue with other replications
      }
    }

    log.info('Replication execution completed', {
      changeRequestId,
      executedCount: executedReplications.length
    })

    res.json({
      success: true,
      changeRequestId,
      executed: executedReplications.length,
      replications: executedReplications,
      message: `Replication initiated for ${executedReplications.length} project${executedReplications.length !== 1 ? 's' : ''}`
    })
  } catch (error) {
    log.error('Execute replication error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router
