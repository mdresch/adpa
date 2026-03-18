/**
 * Drift Detection Service
 * Detects and manages drift from project baselines
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { baselineService, BaselineComparison } from './baselineService'
import { entityExtractionService, ExtractedEntity } from './entityExtractionService'
import { v4 as uuidv4 } from 'uuid'
import { escalationService } from './escalationService'

// Normalized drift point with snake_case fields from storage plus camelCase helpers used by
// downstream resolution/notification services.
export interface DriftPoint {
  drift_type: string
  driftType?: string
  drift_severity: string
  driftSeverity?: string
  drift_description?: string
  description?: string
  detection_type?: string
  detectionType?: string
  details?: any
  entityType?: string
  variance?: number
  baselineValue?: any
  currentValue?: any
  requiresApproval?: boolean
}

export type DriftType = 'scope' | 'timeline' | 'resource' | 'risk' | 'compliance' | 'quality' | 'other'
export type DriftSeverity = 'critical' | 'warning' | 'info'

export interface DriftDetection {
  id: string
  project_id: string
  baseline_id?: string
  comparison_id?: string
  drift_type: DriftType
  drift_category: string
  severity: DriftSeverity
  title: string
  description: string
  drift_data: Record<string, any>
  affected_entity_ids: string[]
  affected_entity_types: string[]
  detection_method: 'automated' | 'manual' | 'scheduled' | 'ml_anomaly'
  detection_confidence?: number
  status: 'open' | 'acknowledged' | 'accepted' | 'reverted' | 'resolved' | 'false_positive'
  resolution_action?: string
  resolution_notes?: string
  resolved_at?: Date
  resolved_by?: string
  jira_issue_key?: string
  jira_issue_url?: string
  confluence_page_id?: string
  detected_at: Date
  detected_by?: string
  updated_at: Date
}

export interface DriftDetectionRule {
  id?: string
  project_id?: string
  organization_id?: string
  rule_name: string
  rule_type: DriftType
  rule_config: Record<string, any>
  threshold_config: Record<string, any>
  severity_mapping: Record<string, DriftSeverity>
  is_active: boolean
  is_global: boolean
}

export interface DriftDetectionOptions {
  baselineId?: string
  autoCreateJiraIssue?: boolean
  autoUpdateConfluence?: boolean
  minSeverity?: DriftSeverity
}

export class DriftDetectionService {
  async checkForDrift(projectId: string, documentId?: string): Promise<{ hasDrift: boolean; driftPoints: DriftPoint[]; severity: DriftSeverity }> {
    const drifts = await this.detectDrift(projectId)
    const driftPoints: DriftPoint[] = drifts.map(d => ({
      drift_type: d.drift_type,
      driftType: d.drift_type,
      drift_severity: d.severity,
      driftSeverity: d.severity,
      drift_description: d.description,
      description: d.description,
      detection_type: d.drift_category,
      detectionType: d.drift_category,
      details: d.drift_data,
      entityType: d.drift_category,
      variance: (d.drift_data as any)?.variance,
      baselineValue: (d.drift_data as any)?.baseline_value,
      currentValue: (d.drift_data as any)?.current_value,
      requiresApproval: (d.drift_data as any)?.requires_approval
    }))
    const hasDrift = driftPoints.length > 0
    const severity: DriftSeverity = driftPoints.some(dp => dp.drift_severity === 'critical')
      ? 'critical'
      : driftPoints.some(dp => dp.drift_severity === 'warning') ? 'warning' : 'info'
    return { hasDrift, driftPoints, severity }
  }

  async createDriftRecord(params: {
    projectId: string
    documentId: string
    baselineId?: string
    driftPoints: DriftPoint[]
    severity: DriftSeverity
    triggeredBy?: string
  }): Promise<{ id: string; drift_severity: DriftSeverity }> {
    const id = uuidv4()
    try {
      await pool.query(
        `INSERT INTO baseline_drift_detection (id, project_id, source_document_id, baseline_id, drift_severity, drift_description, ai_processing_metadata, status, detected_at, detected_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'detected', CURRENT_TIMESTAMP, $8)
         ON CONFLICT (id) DO NOTHING`,
        [
          id,
          params.projectId,
          params.documentId,
          params.baselineId || null,
          params.severity,
          params.driftPoints.map(d => d.drift_description).filter(Boolean).join('; ') || null,
          JSON.stringify({ drift_points: params.driftPoints }),
          params.triggeredBy || null,
        ]
      )
    } catch (error: any) {
      logger.warn('[DRIFT] Failed to persist drift record, returning in-memory object', { error: error.message })
    }
    return { id, drift_severity: params.severity }
  }

  /**
   * Check and trigger escalation if drift breaches thresholds (TASK-742)
   */
  async checkAndTriggerEscalation(driftRecord: { id: string }, driftPoints: DriftPoint[]): Promise<void> {
    try {
      logger.info('[DRIFT] Checking and triggering escalation for drift record:', driftRecord.id)

      // 1. Fetch the full drift record from database
      const result = await pool.query(
        `SELECT project_id, source_document_id, drift_severity, ai_processing_metadata 
         FROM baseline_drift_detection 
         WHERE id = $1`,
        [driftRecord.id]
      )

      if (result.rows.length === 0) {
        logger.warn('[DRIFT] Drift record not found for escalation check:', driftRecord.id)
        return
      }

      const drift = result.rows[0]
      const driftData = drift.ai_processing_metadata || {}

      // Ensure source_document_id is available in metadata for the escalation service
      driftData.source_document_id = drift.source_document_id

      // 2. Identify unique drift types in this record
      const driftTypes = [...new Set(driftPoints.map(dp => dp.drift_type || dp.driftType).filter(Boolean))]

      if (driftTypes.length === 0) {
        logger.info('[DRIFT] No specific drift types found, defaulting to "other" for evaluation')
        driftTypes.push('other')
      }

      // 3. Trigger escalation evaluation for each drift type
      for (const type of driftTypes) {
        logger.info(`[DRIFT] Triggering escalation evaluation for type: ${type}`, {
          driftId: driftRecord.id,
          projectId: drift.project_id
        })

        await escalationService.processDriftEscalation(
          driftRecord.id,
          drift.project_id,
          type!,
          drift.drift_severity,
          driftData
        )
      }

      logger.info('[DRIFT] Escalation orchestration completed', { driftId: driftRecord.id })
    } catch (error) {
      logger.error('[DRIFT] Error in checkAndTriggerEscalation flow:', error)
      // We don't throw here to avoid failing the high-level drift detection job
    }
  }
  /**
   * Detect drift for a project
   */
  async detectDrift(
    projectId: string,
    options: DriftDetectionOptions = {}
  ): Promise<DriftDetection[]> {
    try {
      logger.info('🔍 Starting drift detection', { projectId, options })

      // Get active baseline for project
      let baselineId = options.baselineId
      if (!baselineId) {
        const baselines = await baselineService.getProjectBaselines(projectId, {
          status: 'active',
          baselineType: 'project'
        })

        if (baselines.length === 0) {
          logger.warn('⚠️ No active baseline found for project', { projectId })
          return []
        }

        // Use most recent active baseline
        baselineId = baselines[0].id
      }

      // Compare current state to baseline
      const comparison = await baselineService.compareToBaseline(baselineId)

      if (!comparison.drift_detected) {
        logger.info('✅ No drift detected', { projectId, baselineId })
        return []
      }

      // Analyze comparison and create drift detections
      const driftDetections = await this.analyzeComparison(
        projectId,
        baselineId,
        comparison,
        options
      )

      // Store drift detections
      const storedDrifts: DriftDetection[] = []
      for (const drift of driftDetections) {
        try {
          const stored = await this.storeDriftDetection(drift)
          storedDrifts.push(stored)

          // Auto-create Jira issue if enabled
          if (options.autoCreateJiraIssue && drift.severity === 'critical') {
            await this.createJiraIssueForDrift(stored)
          }
        } catch (error: any) {
          logger.error('❌ Failed to store drift detection', {
            drift,
            error: error.message
          })
        }
      }

      logger.info('✅ Drift detection completed', {
        projectId,
        baselineId,
        driftCount: storedDrifts.length
      })

      return storedDrifts
    } catch (error: any) {
      logger.error('❌ Drift detection failed', {
        projectId,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Analyze comparison and create drift detections
   */
  private async analyzeComparison(
    projectId: string,
    baselineId: string,
    comparison: BaselineComparison,
    options: DriftDetectionOptions
  ): Promise<Omit<DriftDetection, 'id' | 'detected_at' | 'updated_at'>[]> {
    const drifts: Omit<DriftDetection, 'id' | 'detected_at' | 'updated_at'>[] = []

    // Get active rules for project
    const rules = await this.getActiveRules(projectId)

    // Analyze new entities (scope drift)
    if (comparison.comparison_result.new_entities.length > 0) {
      const scopeDrift = this.analyzeScopeDrift(
        comparison.comparison_result.new_entities,
        rules,
        projectId,
        baselineId,
        baselineId
      )
      if (scopeDrift && (!options.minSeverity || this.isSeverityAbove(scopeDrift.severity, options.minSeverity))) {
        drifts.push(scopeDrift)
      }
    }

    // Analyze removed entities (scope drift)
    if (comparison.comparison_result.removed_entities.length > 0) {
      const removalDrift = this.analyzeRemovalDrift(
        comparison.comparison_result.removed_entities,
        rules,
        projectId,
        baselineId,
        baselineId
      )
      if (removalDrift && (!options.minSeverity || this.isSeverityAbove(removalDrift.severity, options.minSeverity))) {
        drifts.push(removalDrift)
      }
    }

    // Analyze modified entities (timeline, resource, risk drift)
    for (const modified of comparison.comparison_result.modified_entities) {
      const modifiedDrifts = this.analyzeModifiedEntity(
        modified.entity,
        modified.changes,
        rules,
        projectId,
        baselineId,
        baselineId
      )
      drifts.push(...modifiedDrifts.filter(d =>
        !options.minSeverity || this.isSeverityAbove(d.severity, options.minSeverity)
      ))
    }

    return drifts
  }

  /**
   * Analyze scope drift from new entities
   */
  private analyzeScopeDrift(
    newEntities: ExtractedEntity[],
    rules: DriftDetectionRule[],
    projectId: string,
    baselineId: string,
    comparisonId?: string
  ): Omit<DriftDetection, 'id' | 'detected_at' | 'updated_at'> | null {
    // Count by type
    const countsByType: Record<string, number> = {}
    for (const entity of newEntities) {
      countsByType[entity.entity_type] = (countsByType[entity.entity_type] || 0) + 1
    }

    // Check rules
    const scopeRule = rules.find(r => r.rule_type === 'scope' && r.is_active)
    let severity: DriftSeverity = 'info'
    let thresholdBreached = false

    if (scopeRule) {
      const threshold = scopeRule.threshold_config
      const totalNew = newEntities.length

      // Check thresholds
      if (threshold.new_entities_count && totalNew > threshold.new_entities_count) {
        thresholdBreached = true
        severity = scopeRule.severity_mapping[`new_entities_${totalNew}`] || 'warning'
      }

      if (threshold.new_deliverables_count && countsByType.deliverable > threshold.new_deliverables_count) {
        thresholdBreached = true
        severity = 'critical'
      }
    } else {
      // Default: critical if >10 new entities, warning if >5
      if (newEntities.length > 10) {
        severity = 'critical'
        thresholdBreached = true
      } else if (newEntities.length > 5) {
        severity = 'warning'
        thresholdBreached = true
      }
    }

    if (!thresholdBreached && newEntities.length === 0) {
      return null
    }

    return {
      project_id: projectId,
      baseline_id: baselineId,
      comparison_id: comparisonId,
      drift_type: 'scope',
      drift_category: 'new_entities',
      severity,
      title: `Scope Drift: ${newEntities.length} New Entities Detected`,
      description: `The project has ${newEntities.length} new entities not present in the baseline. This may indicate scope creep.`,
      drift_data: {
        new_entities_count: newEntities.length,
        by_type: countsByType,
        entity_types: Object.keys(countsByType)
      },
      affected_entity_ids: newEntities.filter(e => e.id).map(e => e.id!),
      affected_entity_types: Object.keys(countsByType),
      detection_method: 'automated',
      detection_confidence: 85,
      status: 'open'
    }
  }

  /**
   * Analyze removal drift
   */
  private analyzeRemovalDrift(
    removedEntities: ExtractedEntity[],
    rules: DriftDetectionRule[],
    projectId: string,
    baselineId: string,
    comparisonId?: string
  ): Omit<DriftDetection, 'id' | 'detected_at' | 'updated_at'> | null {
    if (removedEntities.length === 0) return null

    const scopeRule = rules.find(r => r.rule_type === 'scope' && r.is_active)
    let severity: DriftSeverity = 'warning'

    if (removedEntities.length > 5) {
      severity = 'critical'
    }

    return {
      project_id: projectId,
      baseline_id: baselineId,
      comparison_id: comparisonId,
      drift_type: 'scope',
      drift_category: 'removed_entities',
      severity,
      title: `Scope Drift: ${removedEntities.length} Entities Removed`,
      description: `${removedEntities.length} entities from the baseline have been removed. This may indicate scope reduction or entity cleanup.`,
      drift_data: {
        removed_entities_count: removedEntities.length
      },
      affected_entity_ids: removedEntities.filter(e => e.id).map(e => e.id!),
      affected_entity_types: [...new Set(removedEntities.map(e => e.entity_type))],
      detection_method: 'automated',
      detection_confidence: 90,
      status: 'open'
    }
  }

  /**
   * Analyze modified entity for drift
   */
  private analyzeModifiedEntity(
    entity: ExtractedEntity,
    changes: Record<string, { old: any; new: any }>,
    rules: DriftDetectionRule[],
    projectId: string,
    baselineId: string,
    comparisonId?: string
  ): Omit<DriftDetection, 'id' | 'detected_at' | 'updated_at'>[] {
    const drifts: Omit<DriftDetection, 'id' | 'detected_at' | 'updated_at'>[] = []

    // Check for timeline drift (due_date changes)
    if (changes.due_date || changes.end_date || changes.start_date) {
      const timelineDrift = this.analyzeTimelineDrift(
        entity,
        changes,
        rules,
        projectId,
        baselineId,
        comparisonId
      )
      if (timelineDrift) drifts.push(timelineDrift)
    }

    // Check for risk drift (probability/impact changes)
    if (entity.entity_type === 'risk' && (changes.probability || changes.impact)) {
      const riskDrift = this.analyzeRiskDrift(
        entity,
        changes,
        rules,
        projectId,
        baselineId,
        comparisonId
      )
      if (riskDrift) drifts.push(riskDrift)
    }

    // Check for resource drift (owner/assignee changes)
    if (changes.owner || changes.assigned_to || changes.resources) {
      const resourceDrift = this.analyzeResourceDrift(
        entity,
        changes,
        rules,
        projectId,
        baselineId,
        comparisonId
      )
      if (resourceDrift) drifts.push(resourceDrift)
    }

    return drifts
  }

  /**
   * Analyze timeline drift
   */
  private analyzeTimelineDrift(
    entity: ExtractedEntity,
    changes: Record<string, { old: any; new: any }>,
    rules: DriftDetectionRule[],
    projectId: string,
    baselineId: string,
    comparisonId?: string
  ): Omit<DriftDetection, 'id' | 'detected_at' | 'updated_at'> | null {
    const timelineRule = rules.find(r => r.rule_type === 'timeline' && r.is_active)

    let severity: DriftSeverity = 'info'
    let delayDays = 0

    // Calculate delay
    if (changes.due_date) {
      const oldDate = new Date(changes.due_date.old)
      const newDate = new Date(changes.due_date.new)
      delayDays = Math.ceil((newDate.getTime() - oldDate.getTime()) / (1000 * 60 * 60 * 24))
    }

    if (timelineRule) {
      const threshold = timelineRule.threshold_config
      if (threshold.milestone_delay_days && delayDays > threshold.milestone_delay_days) {
        severity = timelineRule.severity_mapping[`delay_${delayDays}`] || 'warning'
      }
    } else {
      // Default thresholds
      if (delayDays > 30) severity = 'critical'
      else if (delayDays > 14) severity = 'warning'
      else if (delayDays > 7) severity = 'info'
    }

    if (delayDays <= 0) return null

    return {
      project_id: projectId,
      baseline_id: baselineId,
      comparison_id: comparisonId,
      drift_type: 'timeline',
      drift_category: 'date_delay',
      severity,
      title: `Timeline Drift: ${entity.entity_name} Delayed by ${delayDays} Days`,
      description: `The ${entity.entity_type} "${entity.entity_name}" has been delayed by ${delayDays} days from the baseline.`,
      drift_data: {
        entity_type: entity.entity_type,
        entity_name: entity.entity_name,
        delay_days: delayDays,
        old_date: changes.due_date?.old || changes.end_date?.old,
        new_date: changes.due_date?.new || changes.end_date?.new
      },
      affected_entity_ids: entity.id ? [entity.id] : [],
      affected_entity_types: [entity.entity_type],
      detection_method: 'automated',
      detection_confidence: 95,
      status: 'open'
    }
  }

  /**
   * Analyze risk drift
   */
  private analyzeRiskDrift(
    entity: ExtractedEntity,
    changes: Record<string, { old: any; new: any }>,
    rules: DriftDetectionRule[],
    projectId: string,
    baselineId: string,
    comparisonId?: string
  ): Omit<DriftDetection, 'id' | 'detected_at' | 'updated_at'> | null {
    const riskIncreased =
      (changes.probability && this.isRiskLevelHigher(changes.probability.new, changes.probability.old)) ||
      (changes.impact && this.isRiskLevelHigher(changes.impact.new, changes.impact.old))

    if (!riskIncreased) return null

    return {
      project_id: projectId,
      baseline_id: baselineId,
      comparison_id: comparisonId,
      drift_type: 'risk',
      drift_category: 'risk_increase',
      severity: 'warning',
      title: `Risk Drift: ${entity.entity_name} Risk Level Increased`,
      description: `The risk "${entity.entity_name}" has increased in probability or impact.`,
      drift_data: {
        entity_type: entity.entity_type,
        entity_name: entity.entity_name,
        changes
      },
      affected_entity_ids: entity.id ? [entity.id] : [],
      affected_entity_types: [entity.entity_type],
      detection_method: 'automated',
      detection_confidence: 80,
      status: 'open'
    }
  }

  /**
   * Analyze resource drift
   */
  private analyzeResourceDrift(
    entity: ExtractedEntity,
    changes: Record<string, { old: any; new: any }>,
    rules: DriftDetectionRule[],
    projectId: string,
    baselineId: string,
    comparisonId?: string
  ): Omit<DriftDetection, 'id' | 'detected_at' | 'updated_at'> | null {
    return {
      project_id: projectId,
      baseline_id: baselineId,
      comparison_id: comparisonId,
      drift_type: 'resource',
      drift_category: 'resource_change',
      severity: 'info',
      title: `Resource Drift: ${entity.entity_name} Resource Assignment Changed`,
      description: `The resource assignment for "${entity.entity_name}" has changed.`,
      drift_data: {
        entity_type: entity.entity_type,
        entity_name: entity.entity_name,
        changes
      },
      affected_entity_ids: entity.id ? [entity.id] : [],
      affected_entity_types: [entity.entity_type],
      detection_method: 'automated',
      detection_confidence: 75,
      status: 'open'
    }
  }

  /**
   * Store drift detection in database
   */
  private async storeDriftDetection(
    drift: Omit<DriftDetection, 'id' | 'detected_at' | 'updated_at'>
  ): Promise<DriftDetection> {
    const driftId = uuidv4()

    const result = await pool.query(
      `INSERT INTO drift_detections (
        id, project_id, baseline_id, comparison_id,
        drift_type, drift_category, severity, title, description, drift_data,
        affected_entity_ids, affected_entity_types,
        detection_method, detection_confidence, status,
        detected_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
      `,
      [
        driftId,
        drift.project_id,
        drift.baseline_id || null,
        drift.comparison_id || null,
        drift.drift_type,
        drift.drift_category,
        drift.severity,
        drift.title,
        drift.description,
        JSON.stringify(drift.drift_data),
        drift.affected_entity_ids || [],
        drift.affected_entity_types || [],
        drift.detection_method,
        drift.detection_confidence || null,
        drift.status
      ]
    )

    return this.mapRowToDriftDetection(result.rows[0])
  }

  /**
   * Get drift detections for a project
   */
  async getProjectDrifts(
    projectId: string,
    filters?: {
      driftType?: DriftType
      severity?: DriftSeverity
      status?: DriftDetection['status']
      limit?: number
      offset?: number
    }
  ): Promise<DriftDetection[]> {
    try {
      let query = `SELECT * FROM drift_detections WHERE project_id = $1`
      const params: any[] = [projectId]

      if (filters?.driftType) {
        query += ` AND drift_type = $${params.length + 1}`
        params.push(filters.driftType)
      }

      if (filters?.severity) {
        query += ` AND severity = $${params.length + 1}`
        params.push(filters.severity)
      }

      if (filters?.status) {
        query += ` AND status = $${params.length + 1}`
        params.push(filters.status)
      }

      query += ` ORDER BY detected_at DESC`

      if (filters?.limit) {
        query += ` LIMIT $${params.length + 1}`
        params.push(filters.limit)
      }

      if (filters?.offset) {
        query += ` OFFSET $${params.length + 1}`
        params.push(filters.offset)
      }

      const result = await pool.query(query, params)
      return result.rows.map(row => this.mapRowToDriftDetection(row))
    } catch (error: any) {
      logger.error('❌ Failed to get project drifts', {
        projectId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Resolve drift detection
   */
  async resolveDrift(
    driftId: string,
    userId: string,
    resolutionAction: 'accept' | 'revert' | 'adjust' | 'ignore',
    resolutionNotes?: string
  ): Promise<void> {
    try {
      await pool.query(
        `UPDATE drift_detections
         SET status = $1, resolution_action = $2, resolution_notes = $3,
             resolved_at = CURRENT_TIMESTAMP, resolved_by = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
        `,
        [
          resolutionAction === 'accept' ? 'accepted' :
            resolutionAction === 'revert' ? 'reverted' :
              resolutionAction === 'ignore' ? 'false_positive' : 'resolved',
          resolutionAction,
          resolutionNotes || null,
          userId,
          driftId
        ]
      )

      logger.info('✅ Drift resolved', { driftId, resolutionAction, userId })
    } catch (error: any) {
      logger.error('❌ Failed to resolve drift', {
        driftId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get active drift detection rules
   */
  async getActiveRules(projectId: string): Promise<DriftDetectionRule[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM drift_detection_rules
         WHERE (project_id = $1 OR is_global = true) AND is_active = true
         ORDER BY is_global DESC, created_at DESC
        `,
        [projectId]
      )

      return result.rows.map(row => ({
        id: row.id,
        project_id: row.project_id,
        organization_id: row.organization_id,
        rule_name: row.rule_name,
        rule_type: row.rule_type,
        rule_config: typeof row.rule_config === 'string'
          ? JSON.parse(row.rule_config)
          : row.rule_config,
        threshold_config: typeof row.threshold_config === 'string'
          ? JSON.parse(row.threshold_config)
          : row.threshold_config || {},
        severity_mapping: typeof row.severity_mapping === 'string'
          ? JSON.parse(row.severity_mapping)
          : row.severity_mapping || {},
        is_active: row.is_active,
        is_global: row.is_global
      }))
    } catch (error: any) {
      logger.error('❌ Failed to get active rules', {
        projectId,
        error: error.message
      })
      return []
    }
  }

  /**
   * Create Jira issue for drift
   */
  private async createJiraIssueForDrift(drift: DriftDetection): Promise<void> {
    try {
      // Import Jira linkage service
      const { jiraLinkageService } = await import('./jiraLinkageService')

      const issueDescription = `${drift.description}\n\nDrift Type: ${drift.drift_type}\nSeverity: ${drift.severity}\nAffected Entities: ${drift.affected_entity_ids.length}`

      const result = await jiraLinkageService.linkDocumentToJira(
        drift.id, // Use drift ID as document ID
        drift.title,
        drift.project_id,
        undefined, // No Confluence URL
        issueDescription,
        'Bug', // Issue type for drift
        drift.severity === 'critical' ? 'Highest' : drift.severity === 'warning' ? 'High' : 'Medium'
      )

      if (result) {
        await pool.query(
          `UPDATE drift_detections
           SET jira_issue_key = $1, jira_issue_url = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $3
          `,
          [result.issueKey, result.issueUrl, drift.id]
        )

        logger.info('✅ Jira issue created for drift', {
          driftId: drift.id,
          jiraIssueKey: result.issueKey
        })
      }
    } catch (error: any) {
      logger.warn('⚠️ Failed to create Jira issue for drift', {
        driftId: drift.id,
        error: error.message
      })
      // Don't throw - Jira integration is optional
    }
  }

  /**
   * Helper: Check if risk level is higher
   */
  private isRiskLevelHigher(newLevel: string, oldLevel: string): boolean {
    const levels = { low: 1, medium: 2, high: 3 }
    return (levels[newLevel.toLowerCase() as keyof typeof levels] || 0) >
      (levels[oldLevel.toLowerCase() as keyof typeof levels] || 0)
  }

  /**
   * Helper: Check if severity is above threshold
   */
  private isSeverityAbove(severity: DriftSeverity, minSeverity: DriftSeverity): boolean {
    const levels = { info: 1, warning: 2, critical: 3 }
    return (levels[severity] || 0) >= (levels[minSeverity] || 0)
  }

  /**
   * Map database row to DriftDetection object
   */
  private mapRowToDriftDetection(row: any): DriftDetection {
    return {
      id: row.id,
      project_id: row.project_id,
      baseline_id: row.baseline_id,
      comparison_id: row.comparison_id,
      drift_type: row.drift_type,
      drift_category: row.drift_category,
      severity: row.severity,
      title: row.title,
      description: row.description,
      drift_data: typeof row.drift_data === 'string'
        ? JSON.parse(row.drift_data)
        : row.drift_data || {},
      affected_entity_ids: row.affected_entity_ids || [],
      affected_entity_types: row.affected_entity_types || [],
      detection_method: row.detection_method,
      detection_confidence: row.detection_confidence,
      status: row.status,
      resolution_action: row.resolution_action,
      resolution_notes: row.resolution_notes,
      resolved_at: row.resolved_at ? new Date(row.resolved_at) : undefined,
      resolved_by: row.resolved_by,
      jira_issue_key: row.jira_issue_key,
      jira_issue_url: row.jira_issue_url,
      confluence_page_id: row.confluence_page_id,
      detected_at: new Date(row.detected_at),
      detected_by: row.detected_by,
      updated_at: new Date(row.updated_at)
    }
  }
}

export const driftDetectionService = new DriftDetectionService()
