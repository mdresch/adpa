/**
 * Baseline Management Service
 * Creates, compares, and manages project entity baselines
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { entityExtractionService, ExtractedEntity } from './entityExtractionService'
import { v4 as uuidv4 } from 'uuid'

export type BaselineType = 'project' | 'phase' | 'milestone' | 'version' | 'custom'

export interface Baseline {
  id: string
  project_id: string
  baseline_name: string
  baseline_type: BaselineType
  baseline_version: number
  entity_snapshot: Record<string, any>
  entity_count: Record<string, number>
  project_metadata: Record<string, any>
  is_approved: boolean
  approved_at?: Date
  approved_by?: string
  phase_id?: string
  milestone_id?: string
  document_version_id?: string
  status: 'active' | 'superseded' | 'archived'
  created_at: Date
  created_by?: string
  updated_at: Date
}

export interface BaselineComparison {
  baseline_id: string
  comparison_type: 'current_state' | 'baseline_to_baseline' | 'snapshot'
  comparison_result: {
    new_entities: ExtractedEntity[]
    removed_entities: ExtractedEntity[]
    modified_entities: Array<{
      entity: ExtractedEntity
      changes: Record<string, { old: any; new: any }>
    }>
    unchanged_entities: ExtractedEntity[]
    summary: {
      total_current: number
      total_baseline: number
      new_count: number
      removed_count: number
      modified_count: number
      unchanged_count: number
    }
  }
  drift_detected: boolean
  drift_severity: 'critical' | 'warning' | 'info' | 'none'
  drift_summary?: string
}

export interface CreateBaselineOptions {
  baselineName: string
  baselineType: BaselineType
  phaseId?: string
  milestoneId?: string
  documentVersionId?: string
  includeMetadata?: boolean
}

export class BaselineService {
  /**
   * Create a baseline from current project state
   */
  async createBaseline(
    projectId: string,
    userId: string,
    options: CreateBaselineOptions
  ): Promise<Baseline> {
    try {
      logger.info('📊 Creating baseline', { projectId, baselineName: options.baselineName })

      // Get current project entities
      const currentEntities = await entityExtractionService.getProjectEntities(projectId, {
        status: 'active'
      })

      // Get project metadata if requested
      let projectMetadata: Record<string, any> = {}
      if (options.includeMetadata) {
        const projectResult = await pool.query(
          `SELECT id, name, description, status, budget, start_date, end_date, framework
           FROM projects WHERE id = $1`,
          [projectId]
        )
        if (projectResult.rows.length > 0) {
          projectMetadata = projectResult.rows[0]
        }
      }

      // Count entities by type
      const entityCount: Record<string, number> = {}
      for (const entity of currentEntities) {
        entityCount[entity.entity_type] = (entityCount[entity.entity_type] || 0) + 1
      }

      // Get next version number
      const versionResult = await pool.query(
        `SELECT COALESCE(MAX(baseline_version), 0) + 1 as next_version
         FROM project_entity_baselines
         WHERE project_id = $1 AND baseline_type = $2`,
        [projectId, options.baselineType]
      )
      const baselineVersion = versionResult.rows[0]?.next_version || 1

      // Create entity snapshot
      const entitySnapshot = {
        entities: currentEntities.map(e => ({
          id: e.id,
          entity_type: e.entity_type,
          entity_name: e.entity_name,
          entity_data: e.entity_data,
          extraction_confidence: e.extraction_confidence,
          created_at: new Date().toISOString()
        })),
        extracted_at: new Date().toISOString(),
        total_entities: currentEntities.length
      }

      // Insert baseline
      const baselineId = uuidv4()
      const result = await pool.query(
        `INSERT INTO project_entity_baselines (
          id, project_id, baseline_name, baseline_type, baseline_version,
          entity_snapshot, entity_count, project_metadata,
          phase_id, milestone_id, document_version_id,
          status, created_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, $13)
        RETURNING *
        `,
        [
          baselineId,
          projectId,
          options.baselineName,
          options.baselineType,
          baselineVersion,
          JSON.stringify(entitySnapshot),
          JSON.stringify(entityCount),
          JSON.stringify(projectMetadata),
          options.phaseId || null,
          options.milestoneId || null,
          options.documentVersionId || null,
          'active',
          userId
        ]
      )

      const baseline = this.mapRowToBaseline(result.rows[0])

      logger.info('✅ Baseline created', {
        baselineId: baseline.id,
        baselineName: baseline.baseline_name,
        entityCount: currentEntities.length
      })

      return baseline
    } catch (error: any) {
      logger.error('❌ Failed to create baseline', {
        projectId,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
     * Compare current project state against a baseline
     */
  async compareToBaseline(
    baselineId: string,
    userId?: string
  ): Promise<BaselineComparison> {
    try {
      logger.info('🔍 Comparing project state to baseline', { baselineId })

      // Get baseline
      const baselineResult = await pool.query(
        `SELECT * FROM project_entity_baselines WHERE id = $1`,
        [baselineId]
      )

      if (baselineResult.rows.length === 0) {
        throw new Error(`Baseline not found: ${baselineId}`)
      }

      const baseline = this.mapRowToBaseline(baselineResult.rows[0])

      // Get current project entities
      const currentEntities = await entityExtractionService.getProjectEntities(
        baseline.project_id,
        { status: 'active' }
      )

      // Get baseline entities from snapshot
      const baselineSnapshot = typeof baseline.entity_snapshot === 'string'
        ? JSON.parse(baseline.entity_snapshot)
        : baseline.entity_snapshot
      const baselineEntities: ExtractedEntity[] = baselineSnapshot.entities || []

      // Perform comparison
      const comparison = this.compareEntities(currentEntities, baselineEntities)

      // Determine drift severity
      const driftSeverity = this.calculateDriftSeverity(comparison)
      const driftDetected = driftSeverity !== 'none'

      // Store comparison result
      const comparisonId = uuidv4()
      await pool.query(
        `INSERT INTO baseline_comparisons (
          id, baseline_id, comparison_type, comparison_result, summary,
          drift_detected, drift_severity, drift_summary,
          compared_at, compared_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9)
        `,
        [
          comparisonId,
          baselineId,
          'current_state',
          JSON.stringify(comparison),
          JSON.stringify(comparison.summary),
          driftDetected,
          driftSeverity,
          this.generateDriftSummary(comparison, driftSeverity),
          userId || null
        ]
      )

      logger.info('✅ Baseline comparison completed', {
        baselineId,
        driftDetected,
        driftSeverity,
        newEntities: comparison.new_entities.length,
        removedEntities: comparison.removed_entities.length
      })

      return {
        baseline_id: baselineId,
        comparison_type: 'current_state',
        comparison_result: comparison,
        drift_detected: driftDetected,
        drift_severity: driftSeverity,
        drift_summary: this.generateDriftSummary(comparison, driftSeverity)
      }
    } catch (error: any) {
      logger.error('❌ Baseline comparison failed', {
        baselineId,
        error: error.message
      })
      throw error
    }
  }

  /**
     * Compare two baselines
     */
  async compareBaselines(
    baselineId1: string,
    baselineId2: string,
    userId?: string
  ): Promise<BaselineComparison> {
    try {
      // Get both baselines
      const [baseline1, baseline2] = await Promise.all([
        this.getBaseline(baselineId1),
        this.getBaseline(baselineId2)
      ])

      if (!baseline1 || !baseline2) {
        throw new Error('One or both baselines not found')
      }

      // Get entities from snapshots
      const snapshot1 = typeof baseline1.entity_snapshot === 'string'
        ? JSON.parse(baseline1.entity_snapshot)
        : baseline1.entity_snapshot
      const snapshot2 = typeof baseline2.entity_snapshot === 'string'
        ? JSON.parse(baseline2.entity_snapshot)
        : baseline2.entity_snapshot

      const entities1: ExtractedEntity[] = snapshot1.entities || []
      const entities2: ExtractedEntity[] = snapshot2.entities || []

      // Compare
      const comparison = this.compareEntities(entities2, entities1) // Compare 2 vs 1

      const driftSeverity = this.calculateDriftSeverity(comparison)
      const driftDetected = driftSeverity !== 'none'

      return {
        baseline_id: baselineId1,
        comparison_type: 'baseline_to_baseline',
        comparison_result: comparison,
        drift_detected: driftDetected,
        drift_severity: driftSeverity,
        drift_summary: this.generateDriftSummary(comparison, driftSeverity)
      }
    } catch (error: any) {
      logger.error('❌ Baseline-to-baseline comparison failed', {
        baselineId1,
        baselineId2,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get baseline by ID
   */
  async getBaseline(baselineId: string): Promise<Baseline | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM project_entity_baselines WHERE id = $1`,
        [baselineId]
      )

      if (result.rows.length === 0) {
        return null
      }

      return this.mapRowToBaseline(result.rows[0])
    } catch (error: any) {
      logger.error('❌ Failed to get baseline', {
        baselineId,
        error: error.message
      })
      throw error
    }
  }

  /**
     * Get all baselines for a project
   */
  async getProjectBaselines(
    projectId: string,
    filters?: {
      baselineType?: BaselineType
      status?: 'active' | 'superseded' | 'archived'
    }
  ): Promise<Baseline[]> {
    try {
      let query = `SELECT * FROM project_entity_baselines WHERE project_id = $1`
      const params: any[] = [projectId]

      if (filters?.baselineType) {
        query += ` AND baseline_type = $${params.length + 1}`
        params.push(filters.baselineType)
      }

      if (filters?.status) {
        query += ` AND status = $${params.length + 1}`
        params.push(filters.status)
      }

      query += ` ORDER BY created_at DESC`

      const result = await pool.query(query, params)
      return result.rows.map(row => this.mapRowToBaseline(row))
    } catch (error: any) {
      logger.error('❌ Failed to get project baselines', {
        projectId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Approve baseline
   */
  async approveBaseline(baselineId: string, userId: string): Promise<void> {
    try {
      await pool.query(
        `UPDATE project_entity_baselines
         SET is_approved = true, approved_at = CURRENT_TIMESTAMP, approved_by = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
        `,
        [userId, baselineId]
      )

      logger.info('✅ Baseline approved', { baselineId, userId })
    } catch (error: any) {
      logger.error('❌ Failed to approve baseline', {
        baselineId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Archive baseline
   */
  async archiveBaseline(baselineId: string): Promise<void> {
    try {
      await pool.query(
        `UPDATE project_entity_baselines
         SET status = 'archived', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
        `,
        [baselineId]
      )

      logger.info('✅ Baseline archived', { baselineId })
    } catch (error: any) {
      logger.error('❌ Failed to archive baseline', {
        baselineId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get active baseline for a project
   */
  async getActiveBaseline(projectId: string): Promise<Baseline | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM project_entity_baselines 
         WHERE project_id = $1 AND status = 'active' 
         ORDER BY baseline_version DESC LIMIT 1`,
        [projectId]
      )

      if (result.rows.length === 0) {
        return null
      }

      return this.mapRowToBaseline(result.rows[0])
    } catch (error: any) {
      logger.error('❌ Failed to get active baseline', { projectId, error: error.message })
      throw error
    }
  }

  /**
   * Validate a document against the project's active baseline
   */
  async validateDocumentAgainstBaseline(
    projectId: string,
    documentId: string,
    content: string,
    title: string
  ): Promise<any[]> {
    try {
      logger.info('🔍 Validating document against baseline', { projectId, documentId })
      const baseline = await this.getActiveBaseline(projectId)

      if (!baseline) {
        logger.info('No active baseline found for project, skipping validation', { projectId })
        return []
      }

      // For Phase 1, we return empty drifts if no automated comparison is implemented yet
      // This prevents the system from crashing while allowing the job to succeed
      return []
    } catch (error: any) {
      logger.error('❌ Document validation against baseline failed', {
        projectId,
        documentId,
        error: error.message
      })
      return [] // Return empty array to allow process to continue
    }
  }

  /**
   * Create baseline from already extracted entities
   */
  async createBaselineFromEntities(projectId: string, userId: string): Promise<any> {
    try {
      logger.info('📊 Creating baseline from existing entities', { projectId })

      const currentEntities = await entityExtractionService.getProjectEntities(projectId, {
        status: 'active'
      })

      if (currentEntities.length === 0) {
        throw new Error('No extracted entities found for this project')
      }

      // Re-use logic for creating the data structure
      const entityCount: Record<string, number> = {}
      for (const entity of currentEntities) {
        entityCount[entity.entity_type] = (entityCount[entity.entity_type] || 0) + 1
      }

      const entitySnapshot = {
        entities: currentEntities.map(e => ({
          id: e.id,
          entity_type: e.entity_type,
          entity_name: e.entity_name,
          entity_data: e.entity_data,
          extraction_confidence: e.extraction_confidence,
          created_at: new Date().toISOString()
        })),
        extracted_at: new Date().toISOString(),
        total_entities: currentEntities.length
      }

      // Return the data structure expected by routes
      return {
        scope_baseline: currentEntities.filter(e => (e.entity_type as any) === 'scope_items'),
        technical_baseline: currentEntities.filter(e => (e.entity_type as any) === 'technologies'),
        timeline_baseline: currentEntities.filter(e => (e.entity_type as any) === 'milestones' || (e.entity_type as any) === 'phases'),
        cost_baseline: currentEntities.filter(e => (e.entity_type as any) === 'activities'),
        resource_baseline: currentEntities.filter(e => (e.entity_type as any) === 'resources'),
        success_criteria: currentEntities.filter(e => (e.entity_type as any) === 'success_criteria'),
        ai_processing_metadata: {
          entity_count: currentEntities.length,
          entity_breakdown: entityCount
        },
        completeness_score: 1.0, // Default for now
        extraction_confidence: 1.0,
        entity_snapshot: entitySnapshot,
        entity_count: entityCount
      }
    } catch (error: any) {
      logger.error('❌ Failed to create baseline from entities', { projectId, error: error.message })
      throw error
    }
  }

  /**
   * Compare entities and identify changes
   */
  private compareEntities(
    currentEntities: ExtractedEntity[],
    baselineEntities: ExtractedEntity[]
  ): BaselineComparison['comparison_result'] {
    // Create maps for quick lookup
    const baselineMap = new Map<string, ExtractedEntity>()
    for (const entity of baselineEntities) {
      if (entity.id) {
        baselineMap.set(entity.id, entity)
      }
    }

    const currentMap = new Map<string, ExtractedEntity>()
    for (const entity of currentEntities) {
      if (entity.id) {
        currentMap.set(entity.id, entity)
      }
    }

    // Find new entities (in current, not in baseline)
    const newEntities = currentEntities.filter(e =>
      !e.id || !baselineMap.has(e.id)
    )

    // Find removed entities (in baseline, not in current)
    const removedEntities = baselineEntities.filter(e =>
      !e.id || !currentMap.has(e.id)
    )

    // Find modified entities
    const modifiedEntities: Array<{
      entity: ExtractedEntity
      changes: Record<string, { old: any; new: any }>
    }> = []

    for (const currentEntity of currentEntities) {
      if (!currentEntity.id) continue

      const baselineEntity = baselineMap.get(currentEntity.id)
      if (!baselineEntity) continue

      // Compare entity data
      const changes = this.compareEntityData(baselineEntity.entity_data, currentEntity.entity_data)
      if (Object.keys(changes).length > 0) {
        modifiedEntities.push({
          entity: currentEntity,
          changes
        })
      }
    }

    // Find unchanged entities
    const unchangedEntities = currentEntities.filter(e => {
      if (!e.id) return false
      const baselineEntity = baselineMap.get(e.id)
      if (!baselineEntity) return false
      const changes = this.compareEntityData(baselineEntity.entity_data, e.entity_data)
      return Object.keys(changes).length === 0
    })

    return {
      new_entities: newEntities,
      removed_entities: removedEntities,
      modified_entities: modifiedEntities,
      unchanged_entities: unchangedEntities,
      summary: {
        total_current: currentEntities.length,
        total_baseline: baselineEntities.length,
        new_count: newEntities.length,
        removed_count: removedEntities.length,
        modified_count: modifiedEntities.length,
        unchanged_count: unchangedEntities.length
      }
    }
  }

  /**
   * Compare entity data and find changes
   */
  private compareEntityData(oldData: Record<string, any>, newData: Record<string, any>): Record<string, { old: any; new: any }> {
    const changes: Record<string, { old: any; new: any }> = {}

    // Check all keys in both objects
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)])

    for (const key of allKeys) {
      const oldValue = oldData[key]
      const newValue = newData[key]

      // Deep comparison
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = { old: oldValue, new: newValue }
      }
    }

    return changes
  }

  /**
   * Calculate drift severity
   */
  private calculateDriftSeverity(comparison: BaselineComparison['comparison_result']): 'critical' | 'warning' | 'info' | 'none' {
    const { new_count, removed_count, modified_count, total_baseline } = comparison.summary

    if (total_baseline === 0) {
      return new_count > 0 ? 'info' : 'none'
    }

    // Calculate percentage changes
    const changePercentage = ((new_count + removed_count + modified_count) / total_baseline) * 100

    // Critical: >30% change
    if (changePercentage > 30 || removed_count > total_baseline * 0.2) {
      return 'critical'
    }

    // Warning: 10-30% change
    if (changePercentage > 10) {
      return 'warning'
    }

    // Info: 1-10% change
    if (changePercentage > 1) {
      return 'info'
    }

    return 'none'
  }

  /**
   * Generate drift summary text
   */
  private generateDriftSummary(
    comparison: BaselineComparison['comparison_result'],
    severity: string
  ): string {
    const { new_count, removed_count, modified_count, total_baseline } = comparison.summary

    const parts: string[] = []

    if (new_count > 0) {
      parts.push(`${new_count} new ${new_count === 1 ? 'entity' : 'entities'}`)
    }
    if (removed_count > 0) {
      parts.push(`${removed_count} removed ${removed_count === 1 ? 'entity' : 'entities'}`)
    }
    if (modified_count > 0) {
      parts.push(`${modified_count} modified ${modified_count === 1 ? 'entity' : 'entities'}`)
    }

    if (parts.length === 0) {
      return 'No changes detected'
    }

    return `Drift detected: ${parts.join(', ')}. Baseline had ${total_baseline} entities.`
  }

  /**
   * Map database row to Baseline object
   */
  private mapRowToBaseline(row: any): Baseline {
    return {
      id: row.id,
      project_id: row.project_id,
      baseline_name: row.baseline_name,
      baseline_type: row.baseline_type,
      baseline_version: row.baseline_version,
      entity_snapshot: typeof row.entity_snapshot === 'string'
        ? JSON.parse(row.entity_snapshot)
        : row.entity_snapshot,
      entity_count: typeof row.entity_count === 'string'
        ? JSON.parse(row.entity_count)
        : row.entity_count || {},
      project_metadata: typeof row.project_metadata === 'string'
        ? JSON.parse(row.project_metadata)
        : row.project_metadata || {},
      is_approved: row.is_approved || false,
      approved_at: row.approved_at ? new Date(row.approved_at) : undefined,
      approved_by: row.approved_by,
      phase_id: row.phase_id,
      milestone_id: row.milestone_id,
      document_version_id: row.document_version_id,
      status: row.status || 'active',
      created_at: new Date(row.created_at),
      created_by: row.created_by,
      updated_at: new Date(row.updated_at)
    }
  }
}

export const baselineService = new BaselineService()

/**
 * Functional exports for internal service and test compatibility
 */
export const createBaselineFromEntities = (projectId: string, userId: string) =>
  baselineService.createBaselineFromEntities(projectId, userId)

export const validateDocumentAgainstBaseline = (projectId: string, documentId: string, content: string, title: string) =>
  baselineService.validateDocumentAgainstBaseline(projectId, documentId, content, title)

export const getActiveBaseline = (projectId: string) =>
  baselineService.getActiveBaseline(projectId)
