/**
 * Project Similarity and Replication Service
 * TASK-748: Replication to similar projects
 * 
 * This service handles:
 * - Detection of similar projects based on various attributes
 * - Management of efficiency improvement replications
 * - Value tracking across replications
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'

export interface SimilarityFactors {
  framework?: string
  domain?: string
  techStack?: string[]
  budgetRange?: { min: number; max: number }
  teamSize?: number
  status?: string
}

export interface ProjectSimilarity {
  id: string
  projectId: string
  similarProjectId: string
  similarityScore: number
  similarityFactors: SimilarityFactors
  frameworkMatch: boolean
  domainMatch: boolean
  techStackMatch: boolean
  budgetRangeMatch: boolean
  teamSizeMatch: boolean
  detectedBy: 'ai' | 'manual' | 'user_defined'
  aiConfidence: number
  status: 'active' | 'inactive' | 'deprecated'
  createdAt: Date
}

export interface EfficiencyImprovementReplication {
  id: string
  sourceProjectId: string
  sourceDriftId?: string
  sourceInnovationId?: string
  targetProjectId: string
  improvementType: string
  improvementTitle: string
  improvementDescription: string
  estimatedValue?: any
  actualValue?: any
  replicationStatus: string
  changeRequestId?: string
  assignedTo?: string
  createdAt: Date
}

export interface ReplicationValueTracking {
  id: string
  sourceProjectId: string
  improvementTitle: string
  totalReplications: number
  successfulReplications: number
  failedReplications: number
  totalEstimatedValue: number
  totalActualValue: number
  roiPercentage: number
  cumulativeCostSavings: number
  cumulativeTimeSavingsDays: number
}

export class ProjectSimilarityService {
  /**
   * Find similar projects based on project attributes
   */
  async findSimilarProjects(
    projectId: string,
    minSimilarityScore: number = 0.5
  ): Promise<ProjectSimilarity[]> {
    try {
      logger.info('[PROJECT_SIMILARITY] Finding similar projects', { 
        projectId, 
        minSimilarityScore 
      })

      const result = await pool.query(
        `SELECT ps.*, 
                sp.name as similar_project_name,
                sp.framework as similar_project_framework,
                sp.status as similar_project_status
         FROM project_similarity ps
         JOIN projects sp ON ps.similar_project_id = sp.id
         WHERE ps.project_id = $1 
           AND ps.similarity_score >= $2
           AND ps.status = 'active'
         ORDER BY ps.similarity_score DESC`,
        [projectId, minSimilarityScore]
      )

      logger.info('[PROJECT_SIMILARITY] Found similar projects', {
        projectId,
        count: result.rows.length
      })

      return result.rows
    } catch (error) {
      logger.error('[PROJECT_SIMILARITY] Error finding similar projects', { 
        error, 
        projectId 
      })
      throw error
    }
  }

  /**
   * Calculate similarity between two projects
   * Returns a score from 0 to 1
   */
  async calculateSimilarity(
    projectId1: string,
    projectId2: string
  ): Promise<number> {
    try {
      // Get both projects
      const result = await pool.query(
        `SELECT id, framework, description, budget, currency, status, metadata
         FROM projects
         WHERE id IN ($1, $2)`,
        [projectId1, projectId2]
      )

      if (result.rows.length !== 2) {
        throw new Error('One or both projects not found')
      }

      const [project1, project2] = result.rows
      let score = 0
      let factors = 0

      // Framework match (weight: 0.3)
      if (project1.framework && project2.framework && 
          project1.framework === project2.framework) {
        score += 0.3
      }
      factors++

      // Budget range match (weight: 0.2)
      if (project1.budget && project2.budget) {
        const budgetRatio = Math.min(project1.budget, project2.budget) / 
                           Math.max(project1.budget, project2.budget)
        if (budgetRatio >= 0.5) { // Within 50% of each other
          score += 0.2 * budgetRatio
        }
        factors++
      }

      // Status match (weight: 0.1)
      if (project1.status && project2.status && 
          project1.status === project2.status) {
        score += 0.1
      }
      factors++

      // Description similarity (weight: 0.2)
      // Simple keyword overlap check
      if (project1.description && project2.description) {
        const words1 = new Set(
          project1.description.toLowerCase()
            .split(/\s+/)
            .filter((w: string) => w.length > 3)
        )
        const words2 = new Set(
          project2.description.toLowerCase()
            .split(/\s+/)
            .filter((w: string) => w.length > 3)
        )
        
        const intersection = new Set(
          [...words1].filter(w => words2.has(w))
        )
        const union = new Set([...words1, ...words2])
        
        if (union.size > 0) {
          const jaccard = intersection.size / union.size
          score += 0.2 * jaccard
        }
        factors++
      }

      // Metadata similarity (weight: 0.2)
      if (project1.metadata && project2.metadata) {
        // Check for common metadata keys/values
        const meta1Keys = Object.keys(project1.metadata)
        const meta2Keys = Object.keys(project2.metadata)
        const commonKeys = meta1Keys.filter(k => meta2Keys.includes(k))
        
        if (meta1Keys.length > 0 || meta2Keys.length > 0) {
          const metaSimilarity = commonKeys.length / 
            Math.max(meta1Keys.length, meta2Keys.length)
          score += 0.2 * metaSimilarity
        }
        factors++
      }

      // Normalize score based on factors considered
      const normalizedScore = factors > 0 ? score : 0

      logger.info('[PROJECT_SIMILARITY] Calculated similarity', {
        projectId1,
        projectId2,
        score: normalizedScore,
        factors
      })

      return Math.min(1, Math.max(0, normalizedScore))
    } catch (error) {
      logger.error('[PROJECT_SIMILARITY] Error calculating similarity', { 
        error, 
        projectId1, 
        projectId2 
      })
      throw error
    }
  }

  /**
   * Detect and store similar projects for a given project
   */
  async detectAndStoreSimilarProjects(
    projectId: string,
    minSimilarityScore: number = 0.5
  ): Promise<ProjectSimilarity[]> {
    try {
      logger.info('[PROJECT_SIMILARITY] Detecting similar projects', { 
        projectId, 
        minSimilarityScore 
      })

      // Get all other projects
      const result = await pool.query(
        `SELECT id FROM projects WHERE id != $1 AND status != 'archived'`,
        [projectId]
      )

      const similarities: ProjectSimilarity[] = []

      // Calculate similarity with each project
      for (const row of result.rows) {
        const otherProjectId = row.id
        const score = await this.calculateSimilarity(projectId, otherProjectId)

        if (score >= minSimilarityScore) {
          // Get project details for similarity factors
          const projectData = await pool.query(
            `SELECT framework, budget, status FROM projects WHERE id IN ($1, $2)`,
            [projectId, otherProjectId]
          )

          const [project, similarProject] = projectData.rows

          // Store similarity
          const insertResult = await pool.query(
            `INSERT INTO project_similarity (
              project_id, similar_project_id, similarity_score,
              framework_match, budget_range_match,
              detected_by, ai_confidence, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (project_id, similar_project_id) 
            DO UPDATE SET 
              similarity_score = EXCLUDED.similarity_score,
              framework_match = EXCLUDED.framework_match,
              budget_range_match = EXCLUDED.budget_range_match,
              updated_at = NOW()
            RETURNING *`,
            [
              projectId,
              otherProjectId,
              score,
              project.framework === similarProject.framework,
              this.isBudgetSimilar(project.budget, similarProject.budget),
              'ai',
              score, // Use similarity score as AI confidence
              'active'
            ]
          )

          similarities.push(insertResult.rows[0])
        }
      }

      logger.info('[PROJECT_SIMILARITY] Detected and stored similar projects', {
        projectId,
        count: similarities.length
      })

      return similarities
    } catch (error) {
      logger.error('[PROJECT_SIMILARITY] Error detecting similar projects', { 
        error, 
        projectId 
      })
      throw error
    }
  }

  /**
   * Create replication record for efficiency improvement
   */
  async createReplication(params: {
    sourceProjectId: string
    targetProjectId: string
    improvementType: string
    improvementTitle: string
    improvementDescription: string
    estimatedValue?: any
    sourceDriftId?: string
    sourceInnovationId?: string
    assignedTo?: string
  }): Promise<EfficiencyImprovementReplication> {
    try {
      logger.info('[REPLICATION] Creating replication record', {
        sourceProjectId: params.sourceProjectId,
        targetProjectId: params.targetProjectId,
        improvementTitle: params.improvementTitle
      })

      const result = await pool.query(
        `INSERT INTO efficiency_improvement_replications (
          source_project_id, target_project_id, source_drift_id, source_innovation_id,
          improvement_type, improvement_title, improvement_description,
          estimated_value, replication_status, assigned_to
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          params.sourceProjectId,
          params.targetProjectId,
          params.sourceDriftId || null,
          params.sourceInnovationId || null,
          params.improvementType,
          params.improvementTitle,
          params.improvementDescription,
          params.estimatedValue ? JSON.stringify(params.estimatedValue) : null,
          'identified',
          params.assignedTo || null
        ]
      )

      // Update value tracking
      await this.updateValueTracking(
        params.sourceProjectId,
        params.improvementTitle
      )

      logger.info('[REPLICATION] Created replication record', {
        replicationId: result.rows[0].id
      })

      return result.rows[0]
    } catch (error) {
      logger.error('[REPLICATION] Error creating replication', { 
        error, 
        params 
      })
      throw error
    }
  }

  /**
   * Get replications for a source project
   */
  async getReplicationsForSource(
    sourceProjectId: string
  ): Promise<EfficiencyImprovementReplication[]> {
    try {
      const result = await pool.query(
        `SELECT r.*, 
                tp.name as target_project_name,
                tp.status as target_project_status
         FROM efficiency_improvement_replications r
         JOIN projects tp ON r.target_project_id = tp.id
         WHERE r.source_project_id = $1
         ORDER BY r.created_at DESC`,
        [sourceProjectId]
      )

      return result.rows
    } catch (error) {
      logger.error('[REPLICATION] Error getting replications for source', { 
        error, 
        sourceProjectId 
      })
      throw error
    }
  }

  /**
   * Get replications for a target project
   */
  async getReplicationsForTarget(
    targetProjectId: string
  ): Promise<EfficiencyImprovementReplication[]> {
    try {
      const result = await pool.query(
        `SELECT r.*, 
                sp.name as source_project_name
         FROM efficiency_improvement_replications r
         JOIN projects sp ON r.source_project_id = sp.id
         WHERE r.target_project_id = $1
         ORDER BY r.created_at DESC`,
        [targetProjectId]
      )

      return result.rows
    } catch (error) {
      logger.error('[REPLICATION] Error getting replications for target', { 
        error, 
        targetProjectId 
      })
      throw error
    }
  }

  /**
   * Update replication status
   */
  async updateReplicationStatus(
    replicationId: string,
    status: string,
    userId?: string,
    notes?: string
  ): Promise<EfficiencyImprovementReplication> {
    try {
      logger.info('[REPLICATION] Updating replication status', {
        replicationId,
        status
      })

      const fields: string[] = ['replication_status = $2', 'updated_at = NOW()']
      const values: any[] = [replicationId, status]
      let paramIndex = 3

      if (status === 'approved' && userId) {
        fields.push(`approved_by = $${paramIndex}`)
        values.push(userId)
        paramIndex++
        fields.push(`approved_at = NOW()`)
      }

      if (status === 'in_progress') {
        fields.push(`started_at = NOW()`)
      }

      if (status === 'completed' || status === 'verified') {
        fields.push(`completed_at = NOW()`)
      }

      if (notes) {
        fields.push(`implementation_notes = $${paramIndex}`)
        values.push(notes)
        paramIndex++
      }

      const result = await pool.query(
        `UPDATE efficiency_improvement_replications 
         SET ${fields.join(', ')}
         WHERE id = $1
         RETURNING *`,
        values
      )

      if (result.rows.length === 0) {
        throw new Error('Replication not found')
      }

      // Update value tracking if status changed to completed or verified
      if (status === 'completed' || status === 'verified') {
        const replication = result.rows[0]
        await this.updateValueTracking(
          replication.source_project_id,
          replication.improvement_title
        )
      }

      logger.info('[REPLICATION] Updated replication status', {
        replicationId,
        status
      })

      return result.rows[0]
    } catch (error) {
      logger.error('[REPLICATION] Error updating replication status', { 
        error, 
        replicationId 
      })
      throw error
    }
  }

  /**
   * Update value tracking for an improvement
   */
  private async updateValueTracking(
    sourceProjectId: string,
    improvementTitle: string
  ): Promise<void> {
    try {
      // Get all replications for this improvement
      const result = await pool.query(
        `SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE replication_status = 'verified') as successful,
          COUNT(*) FILTER (WHERE replication_status = 'failed') as failed,
          SUM(CASE 
            WHEN estimated_value IS NOT NULL AND estimated_value->>'cost_savings' IS NOT NULL 
            THEN (estimated_value->>'cost_savings')::decimal 
            ELSE 0 
          END) as total_estimated,
          SUM(CASE 
            WHEN actual_value IS NOT NULL AND actual_value->>'cost_savings' IS NOT NULL 
            THEN (actual_value->>'cost_savings')::decimal 
            ELSE 0 
          END) as total_actual,
          MIN(created_at) as first_replication,
          MAX(CASE WHEN replication_status = 'verified' THEN completed_at END) as last_replication
         FROM efficiency_improvement_replications
         WHERE source_project_id = $1 AND improvement_title = $2`,
        [sourceProjectId, improvementTitle]
      )

      const stats = result.rows[0]

      // Calculate ROI
      const totalActual = parseFloat(stats.total_actual) || 0
      const totalEstimated = parseFloat(stats.total_estimated) || 0
      const roi = totalEstimated > 0 ? (totalActual / totalEstimated) * 100 : 0

      // Upsert value tracking
      await pool.query(
        `INSERT INTO replication_value_tracking (
          source_project_id, improvement_title,
          total_replications, successful_replications, failed_replications,
          total_estimated_value, total_actual_value, roi_percentage,
          first_replication_at, last_replication_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (source_project_id, improvement_title)
        DO UPDATE SET
          total_replications = EXCLUDED.total_replications,
          successful_replications = EXCLUDED.successful_replications,
          failed_replications = EXCLUDED.failed_replications,
          total_estimated_value = EXCLUDED.total_estimated_value,
          total_actual_value = EXCLUDED.total_actual_value,
          roi_percentage = EXCLUDED.roi_percentage,
          last_replication_at = EXCLUDED.last_replication_at,
          updated_at = NOW()`,
        [
          sourceProjectId,
          improvementTitle,
          parseInt(stats.total),
          parseInt(stats.successful),
          parseInt(stats.failed),
          totalEstimated,
          totalActual,
          roi,
          stats.first_replication,
          stats.last_replication
        ]
      )

      logger.info('[REPLICATION] Updated value tracking', {
        sourceProjectId,
        improvementTitle,
        totalReplications: stats.total
      })
    } catch (error) {
      logger.error('[REPLICATION] Error updating value tracking', { 
        error, 
        sourceProjectId, 
        improvementTitle 
      })
      // Don't throw - this is a secondary operation
    }
  }

  /**
   * Get value tracking for a source project
   */
  async getValueTracking(
    sourceProjectId: string
  ): Promise<ReplicationValueTracking[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM replication_value_tracking
         WHERE source_project_id = $1
         ORDER BY total_actual_value DESC`,
        [sourceProjectId]
      )

      return result.rows
    } catch (error) {
      logger.error('[REPLICATION] Error getting value tracking', { 
        error, 
        sourceProjectId 
      })
      throw error
    }
  }

  /**
   * Helper: Check if two budgets are similar
   */
  private isBudgetSimilar(budget1?: number, budget2?: number): boolean {
    if (!budget1 || !budget2) return false
    const ratio = Math.min(budget1, budget2) / Math.max(budget1, budget2)
    return ratio >= 0.5 // Within 50% of each other
  }
}

export const projectSimilarityService = new ProjectSimilarityService()
export default projectSimilarityService
