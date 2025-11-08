/**
 * Project Similarity and Replication Routes
 * TASK-748: Replication to similar projects
 */

import express from 'express'
import { authenticateToken } from '../middleware/auth'
import { logger, childLogger } from '../utils/logger'
import projectSimilarityService from '../services/projectSimilarityService'

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

export default router
