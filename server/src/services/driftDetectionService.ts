/**
 * Drift Detection Service
 * CR-2026-001: Automatic Drift Detection & Resolution
 * 
 * Detects when documents drift from approved baselines
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { escalationService } from './escalationService'

export interface DriftPoint {
  entityType: string // 'stakeholder', 'risk', 'milestone', etc.
  driftType: 'added' | 'removed' | 'modified'
  baselineValue: any
  currentValue: any
  variance?: number
  description: string
  requiresApproval: boolean // Major changes need approval
}

export interface DriftDetectionResult {
  hasDrift: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  driftPoints: DriftPoint[]
  summary: string
}

interface ExtractedEntities {
  stakeholders: any[]
  risks: any[]
  milestones: any[]
  deliverables: any[]
  constraints: any[]
  assumptions: any[]
  dependencies: any[]
  resources: any[]
  budget: any
  timeline: any
  scope: any
  success_criteria: any[]
  technical_requirements: any[]
}

interface Baseline {
  id: string
  project_id: string
  version: string
  status: string
  scope_baseline: any
  technical_baseline: any
  timeline_baseline: any
  cost_baseline: any
  resource_baseline: any
  success_criteria: any
}

export class DriftDetectionService {
  /**
   * Check for drift after document update
   */
  async checkForDrift(
    projectId: string,
    documentId: string
  ): Promise<DriftDetectionResult> {
    try {
      logger.info('[DRIFT] Checking for drift', { projectId, documentId })

      // 1. Get approved baseline
      const baseline = await this.getApprovedBaseline(projectId)

      if (!baseline) {
        logger.info('[DRIFT] No approved baseline found for project', { projectId })
        return {
          hasDrift: false,
          severity: 'low',
          driftPoints: [],
          summary: 'No baseline exists for comparison'
        }
      }

      // 2. Extract current entities from document
      const currentEntities = await this.extractEntitiesFromDocument(documentId)

      // 3. Compare with baseline
      const driftPoints = this.compareWithBaseline(baseline, currentEntities)

      // 4. Calculate severity
      const severity = this.calculateDriftSeverity(driftPoints)

      // 5. Generate summary
      const summary = this.generateDriftSummary(driftPoints)

      logger.info('[DRIFT] Detection complete', {
        projectId,
        documentId,
        hasDrift: driftPoints.length > 0,
        severity,
        driftCount: driftPoints.length
      })

      return {
        hasDrift: driftPoints.length > 0,
        severity,
        driftPoints,
        summary
      }
    } catch (error) {
      logger.error('[DRIFT] Detection failed:', error)
      throw error
    }
  }

  /**
   * Get approved baseline for project
   */
  private async getApprovedBaseline(projectId: string): Promise<Baseline | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM project_baselines
         WHERE project_id = $1
           AND status IN ('approved', 'active')
         ORDER BY approved_at DESC
         LIMIT 1`,
        [projectId]
      )

      return result.rows[0] || null
    } catch (error) {
      logger.error('[DRIFT] Error fetching baseline:', error)
      throw error
    }
  }

  /**
   * Extract entities from document content
   */
  private async extractEntitiesFromDocument(documentId: string): Promise<ExtractedEntities> {
    try {
      // Get document content
      const docResult = await pool.query(
        `SELECT content, metadata FROM documents WHERE id = $1`,
        [documentId]
      )

      if (docResult.rows.length === 0) {
        throw new Error(`Document not found: ${documentId}`)
      }

      const { content, metadata } = docResult.rows[0]

      // Parse metadata for extracted entities
      const entities: ExtractedEntities = {
        stakeholders: metadata?.stakeholders || [],
        risks: metadata?.risks || [],
        milestones: metadata?.milestones || [],
        deliverables: metadata?.deliverables || [],
        constraints: metadata?.constraints || [],
        assumptions: metadata?.assumptions || [],
        dependencies: metadata?.dependencies || [],
        resources: metadata?.resources || [],
        budget: metadata?.budget || null,
        timeline: metadata?.timeline || null,
        scope: metadata?.scope || null,
        success_criteria: metadata?.success_criteria || [],
        technical_requirements: metadata?.technical_requirements || []
      }

      // If entities not in metadata, do basic extraction from content
      if (!metadata?.stakeholders && content) {
        entities.stakeholders = this.extractStakeholdersFromText(content)
      }
      if (!metadata?.risks && content) {
        entities.risks = this.extractRisksFromText(content)
      }
      if (!metadata?.milestones && content) {
        entities.milestones = this.extractMilestonesFromText(content)
      }

      return entities
    } catch (error) {
      logger.error('[DRIFT] Error extracting entities:', error)
      throw error
    }
  }

  /**
   * Basic stakeholder extraction from text (fallback)
   */
  private extractStakeholdersFromText(content: string): any[] {
    const stakeholders: any[] = []
    const lines = content.split('\n')

    lines.forEach(line => {
      // Look for patterns like "Stakeholder: Name (Role)"
      const match = line.match(/stakeholder[:\s]+([^(]+)(?:\(([^)]+)\))?/i)
      if (match) {
        stakeholders.push({
          name: match[1].trim(),
          role: match[2]?.trim() || 'Unknown',
          influence_level: 'medium'
        })
      }
    })

    return stakeholders
  }

  /**
   * Basic risk extraction from text (fallback)
   */
  private extractRisksFromText(content: string): any[] {
    const risks: any[] = []
    const lines = content.split('\n')

    lines.forEach(line => {
      // Look for patterns like "Risk: Description"
      const match = line.match(/risk[:\s]+(.+)/i)
      if (match) {
        risks.push({
          description: match[1].trim(),
          probability: 'medium',
          impact: 'medium'
        })
      }
    })

    return risks
  }

  /**
   * Basic milestone extraction from text (fallback)
   */
  private extractMilestonesFromText(content: string): any[] {
    const milestones: any[] = []
    const lines = content.split('\n')

    lines.forEach(line => {
      // Look for patterns like "Milestone: Name - Date"
      const match = line.match(/milestone[:\s]+([^-]+)-\s*(.+)/i)
      if (match) {
        milestones.push({
          name: match[1].trim(),
          date: match[2].trim()
        })
      }
    })

    return milestones
  }

  /**
   * Compare current entities with baseline
   */
  private compareWithBaseline(
    baseline: Baseline,
    currentEntities: ExtractedEntities
  ): DriftPoint[] {
    const driftPoints: DriftPoint[] = []

    // Check stakeholders
    if (baseline.resource_baseline?.stakeholders) {
      const stakeholderDrift = this.detectStakeholderDrift(
        baseline.resource_baseline.stakeholders,
        currentEntities.stakeholders
      )
      driftPoints.push(...stakeholderDrift)
    }

    // Check risks
    if (baseline.scope_baseline?.risks) {
      const riskDrift = this.detectRiskDrift(
        baseline.scope_baseline.risks,
        currentEntities.risks
      )
      driftPoints.push(...riskDrift)
    }

    // Check milestones
    if (baseline.timeline_baseline?.milestones) {
      const milestoneDrift = this.detectMilestoneDrift(
        baseline.timeline_baseline.milestones,
        currentEntities.milestones
      )
      driftPoints.push(...milestoneDrift)
    }

    // Check budget
    if (baseline.cost_baseline?.total_budget && currentEntities.budget) {
      const budgetDrift = this.detectBudgetDrift(
        baseline.cost_baseline.total_budget,
        currentEntities.budget
      )
      if (budgetDrift) {
        driftPoints.push(budgetDrift)
      }
    }

    return driftPoints
  }

  /**
   * Detect stakeholder drift
   */
  private detectStakeholderDrift(
    baselineStakeholders: any[],
    currentStakeholders: any[]
  ): DriftPoint[] {
    const drift: DriftPoint[] = []

    // Check for removed stakeholders
    for (const baseline of baselineStakeholders) {
      const found = currentStakeholders.find(s =>
        this.normalizeString(s.name) === this.normalizeString(baseline.name)
      )

      if (!found) {
        drift.push({
          entityType: 'stakeholder',
          driftType: 'removed',
          baselineValue: baseline,
          currentValue: null,
          description: `Stakeholder "${baseline.name}" removed from document`,
          requiresApproval: baseline.influence_level === 'high'
        })
      }
    }

    // Check for added stakeholders
    for (const current of currentStakeholders) {
      const found = baselineStakeholders.find(s =>
        this.normalizeString(s.name) === this.normalizeString(current.name)
      )

      if (!found) {
        drift.push({
          entityType: 'stakeholder',
          driftType: 'added',
          baselineValue: null,
          currentValue: current,
          description: `New stakeholder "${current.name}" added to document`,
          requiresApproval: current.influence_level === 'high'
        })
      }
    }

    // Check for modifications
    for (const current of currentStakeholders) {
      const baseline = baselineStakeholders.find(s =>
        this.normalizeString(s.name) === this.normalizeString(current.name)
      )

      if (baseline && this.hasStakeholderChanged(baseline, current)) {
        drift.push({
          entityType: 'stakeholder',
          driftType: 'modified',
          baselineValue: baseline,
          currentValue: current,
          description: `Stakeholder "${current.name}" details modified`,
          requiresApproval: false
        })
      }
    }

    return drift
  }

  /**
   * Detect risk drift
   */
  private detectRiskDrift(
    baselineRisks: any[],
    currentRisks: any[]
  ): DriftPoint[] {
    const drift: DriftPoint[] = []

    // Check for removed risks
    for (const baseline of baselineRisks) {
      const found = currentRisks.find(r =>
        this.normalizeString(r.description) === this.normalizeString(baseline.description)
      )

      if (!found) {
        const description = baseline.description || 'Unknown risk'
        drift.push({
          entityType: 'risk',
          driftType: 'removed',
          baselineValue: baseline,
          currentValue: null,
          description: `Risk removed: "${description.substring(0, 50)}..."`,
          requiresApproval: baseline.impact === 'high' || baseline.impact === 'critical'
        })
      }
    }

    // Check for added risks
    for (const current of currentRisks) {
      const found = baselineRisks.find(r =>
        this.normalizeString(r.description) === this.normalizeString(current.description)
      )

      if (!found) {
        const description = current.description || 'Unknown risk'
        drift.push({
          entityType: 'risk',
          driftType: 'added',
          baselineValue: null,
          currentValue: current,
          description: `New risk added: "${description.substring(0, 50)}..."`,
          requiresApproval: current.impact === 'high' || current.impact === 'critical'
        })
      }
    }

    return drift
  }

  /**
   * Detect milestone drift
   */
  private detectMilestoneDrift(
    baselineMilestones: any[],
    currentMilestones: any[]
  ): DriftPoint[] {
    const drift: DriftPoint[] = []

    // Check for removed milestones
    for (const baseline of baselineMilestones) {
      const found = currentMilestones.find(m =>
        this.normalizeString(m.name) === this.normalizeString(baseline.name)
      )

      if (!found) {
        drift.push({
          entityType: 'milestone',
          driftType: 'removed',
          baselineValue: baseline,
          currentValue: null,
          description: `Milestone removed: "${baseline.name}"`,
          requiresApproval: true
        })
      }
    }

    // Check for added milestones
    for (const current of currentMilestones) {
      const found = baselineMilestones.find(m =>
        this.normalizeString(m.name) === this.normalizeString(current.name)
      )

      if (!found) {
        drift.push({
          entityType: 'milestone',
          driftType: 'added',
          baselineValue: null,
          currentValue: current,
          description: `New milestone added: "${current.name}"`,
          requiresApproval: true
        })
      }
    }

    // Check for date changes
    for (const current of currentMilestones) {
      const baseline = baselineMilestones.find(m =>
        this.normalizeString(m.name) === this.normalizeString(current.name)
      )

      if (baseline && baseline.date !== current.date) {
        drift.push({
          entityType: 'milestone',
          driftType: 'modified',
          baselineValue: baseline,
          currentValue: current,
          description: `Milestone date changed: "${current.name}" (${baseline.date} → ${current.date})`,
          requiresApproval: true
        })
      }
    }

    return drift
  }

  /**
   * Detect budget drift
   */
  private detectBudgetDrift(
    baselineBudget: number,
    currentBudget: number
  ): DriftPoint | null {
    // Guard against division by zero
    if (baselineBudget === 0) {
      if (currentBudget === 0) {
        return null // No change
      }
      // Budget went from 0 to something - that's a major change
      return {
        entityType: 'budget',
        driftType: 'modified',
        baselineValue: baselineBudget,
        currentValue: currentBudget,
        variance: 100,
        description: `Budget changed: $${baselineBudget} → $${currentBudget} (new budget added)`,
        requiresApproval: true
      }
    }

    const variance = ((currentBudget - baselineBudget) / baselineBudget) * 100

    if (Math.abs(variance) < 1) {
      return null // Less than 1% variance is acceptable
    }

    return {
      entityType: 'budget',
      driftType: 'modified',
      baselineValue: baselineBudget,
      currentValue: currentBudget,
      variance,
      description: `Budget changed: $${baselineBudget} → $${currentBudget} (${variance > 0 ? '+' : ''}${variance.toFixed(1)}%)`,
      requiresApproval: Math.abs(variance) > 10 // >10% requires approval
    }
  }

  /**
   * Check if stakeholder has changed
   */
  private hasStakeholderChanged(baseline: any, current: any): boolean {
    return (
      baseline.role !== current.role ||
      baseline.influence_level !== current.influence_level ||
      baseline.contact !== current.contact
    )
  }

  /**
   * Normalize string for comparison
   */
  private normalizeString(str: string): string {
    if (!str) return ''
    return str.toLowerCase().trim().replace(/\s+/g, ' ')
  }

  /**
   * Calculate drift severity
   */
  private calculateDriftSeverity(driftPoints: DriftPoint[]): 'low' | 'medium' | 'high' | 'critical' {
    if (driftPoints.length === 0) return 'low'

    // Critical: Any drift requiring approval
    if (driftPoints.some(d => d.requiresApproval)) return 'critical'

    // High: 10+ drift points
    if (driftPoints.length >= 10) return 'high'

    // Medium: 5-9 drift points
    if (driftPoints.length >= 5) return 'medium'

    // Low: 1-4 drift points
    return 'low'
  }

  /**
   * Generate drift summary
   */
  private generateDriftSummary(driftPoints: DriftPoint[]): string {
    if (driftPoints.length === 0) {
      return 'No drift detected'
    }

    const counts = {
      added: driftPoints.filter(d => d.driftType === 'added').length,
      removed: driftPoints.filter(d => d.driftType === 'removed').length,
      modified: driftPoints.filter(d => d.driftType === 'modified').length
    }

    const parts: string[] = []
    if (counts.added > 0) parts.push(`${counts.added} added`)
    if (counts.removed > 0) parts.push(`${counts.removed} removed`)
    if (counts.modified > 0) parts.push(`${counts.modified} modified`)

    return `${driftPoints.length} drift point${driftPoints.length > 1 ? 's' : ''} detected: ${parts.join(', ')}`
  }

  /**
   * Create drift record in database
   */
  async createDriftRecord(data: {
    projectId: string
    documentId: string
    baselineId: string
    driftPoints: DriftPoint[]
    severity: string
    triggeredBy: string
  }): Promise<any> {
    try {
      const result = await pool.query(
        `INSERT INTO baseline_drift_detection (
          baseline_id,
          project_id,
          source_document_id,
          detection_type,
          drift_severity,
          drift_description,
          drift_impact,
          detected_by,
          status,
          ai_processing_metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          data.baselineId,
          data.projectId,
          data.documentId,
          'document_update_drift',
          data.severity,
          this.generateDriftSummary(data.driftPoints),
          JSON.stringify(data.driftPoints),
          data.triggeredBy,
          'detected',
          JSON.stringify({
            drift_count: data.driftPoints.length,
            drift_points: data.driftPoints,
            timestamp: new Date().toISOString()
          })
        ]
      )

      return result.rows[0]
    } catch (error) {
      logger.error('[DRIFT] Error creating drift record:', error)
      throw error
    }
  }

  /**
   * Check if escalation is needed and trigger if required
   * TASK-742: Escalation matrix based on severity
   */
  async checkAndTriggerEscalation(
    driftRecord: any,
    driftPoints: DriftPoint[]
  ): Promise<void> {
    try {
      logger.info('[DRIFT] Checking escalation requirements', {
        driftId: driftRecord.id,
        severity: driftRecord.drift_severity
      })

      // Determine drift type based on detected drift points
      const driftType = this.determineDriftType(driftPoints)
      
      // Build drift data for escalation evaluation
      const driftData = this.buildDriftData(driftRecord, driftPoints)

      // Evaluate against escalation matrix
      const evaluation = await escalationService.evaluateDrift(
        driftRecord.id,
        driftRecord.project_id,
        driftType,
        driftRecord.drift_severity,
        driftData
      )

      // If escalation is needed, create alert
      if (evaluation.shouldEscalate && evaluation.matchedRule) {
        logger.info('[DRIFT] Escalation required, creating alert', {
          ruleName: evaluation.matchedRule.rule_name,
          severity: evaluation.matchedRule.severity_level
        })

        await escalationService.createAlert(
          driftRecord.id,
          driftRecord.project_id,
          evaluation.matchedRule,
          evaluation.variancePercentage,
          driftData
        )
      } else {
        logger.info('[DRIFT] No escalation required', {
          driftId: driftRecord.id
        })
      }
    } catch (error) {
      // Log error but don't fail the drift detection process
      logger.error('[DRIFT] Error checking escalation:', error)
    }
  }

  /**
   * Determine drift type for escalation routing
   */
  private determineDriftType(driftPoints: DriftPoint[]): string {
    // Check for budget-related drift
    if (driftPoints.some(d => d.entityType === 'budget')) {
      const budgetPoint = driftPoints.find(d => d.entityType === 'budget')
      if (budgetPoint && budgetPoint.variance && budgetPoint.variance > 0) {
        return 'budget_overrun'
      }
      return 'cost_drift'
    }

    // Check for scope-related drift
    if (driftPoints.some(d => d.entityType === 'deliverable' || d.entityType === 'scope')) {
      const addedDeliverables = driftPoints.filter(d => 
        (d.entityType === 'deliverable' || d.entityType === 'scope') && d.driftType === 'added'
      )
      if (addedDeliverables.length > 0) {
        return 'scope_creep'
      }
      return 'scope_drift'
    }

    // Check for timeline-related drift
    if (driftPoints.some(d => d.entityType === 'milestone' || d.entityType === 'timeline')) {
      return 'timeline_delay'
    }

    // Check for technical drift
    if (driftPoints.some(d => d.entityType === 'technical_requirements')) {
      return 'technical_drift'
    }

    // Check for resource drift
    if (driftPoints.some(d => d.entityType === 'stakeholder' || d.entityType === 'resources')) {
      return 'resource_drift'
    }

    // Default
    return 'scope_drift'
  }

  /**
   * Build drift data structure for escalation evaluation
   */
  private buildDriftData(driftRecord: any, driftPoints: DriftPoint[]): any {
    const data: any = {
      drift_record_id: driftRecord.id,
      drift_severity: driftRecord.drift_severity,
      drift_points_count: driftPoints.length,
      timestamp: new Date().toISOString()
    }

    // Extract budget information
    const budgetPoint = driftPoints.find(d => d.entityType === 'budget')
    if (budgetPoint) {
      data.approved_budget = budgetPoint.baselineValue
      data.projected_cost = budgetPoint.currentValue
      data.budget_variance = budgetPoint.variance
    }

    // Extract scope information
    const deliverablePoints = driftPoints.filter(d => d.entityType === 'deliverable')
    if (deliverablePoints.length > 0) {
      const baselineCount = deliverablePoints.filter(d => d.baselineValue).length
      const currentCount = deliverablePoints.filter(d => d.currentValue).length
      data.baseline_scope_count = baselineCount
      data.current_scope_count = currentCount
    }

    // Extract timeline information
    const milestonePoints = driftPoints.filter(d => d.entityType === 'milestone')
    if (milestonePoints.length > 0) {
      data.milestone_drift_count = milestonePoints.length
    }

    return data
  }
}

// Export singleton instance
export const driftDetectionService = new DriftDetectionService()
