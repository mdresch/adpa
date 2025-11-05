/**
 * Drift Detection Service
 * CR-2026-001: Automatic Drift Detection & Resolution
 * 
 * Detects when documents drift from approved baselines
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'

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
  // Core 14 entity types from baseline
  scope_items: any[]
  deliverables: any[]
  requirements: any[]
  milestones: any[]
  phases: any[]
  activities: any[]
  resources: any[]
  technologies: any[]
  stakeholders: any[]
  constraints: any[]
  risks: any[]
  success_criteria: any[]
  quality_standards: any[]
  best_practices: any[]
  
  // Legacy fields for backward compatibility
  assumptions: any[]
  dependencies: any[]
  budget: any
  timeline: any
  scope: any
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
  // Priority levels for comparison
  private readonly PRIORITY_LEVELS = {
    'low': 1,
    'medium': 2,
    'high': 3,
    'critical': 4
  } as const

  // Fields to compare for each entity type
  private readonly ENTITY_COMPARISON_FIELDS: Record<string, string[]> = {
    'scope_item': ['description', 'inclusion_status', 'priority'],
    'deliverable': ['description', 'status', 'type', 'acceptance_criteria'],
    'requirement': ['description', 'status', 'priority', 'type'],
    'milestone': ['description', 'status', 'due_date'],
    'phase': ['description', 'status', 'start_date', 'end_date'],
    'activity': ['description', 'duration', 'estimated_hours'],
    'resource': ['description', 'type', 'allocation'],
    'technology': ['category', 'version', 'purpose'],
    'stakeholder': ['role', 'influence_level', 'interest_level', 'contact'],
    'constraint': ['description', 'type', 'impact'],
    'risk': ['description', 'probability', 'impact', 'mitigation_strategy'],
    'success_criterion': ['description', 'target_value', 'measurement_method'],
    'quality_standard': ['description', 'measurement_method', 'target_value'],
    'best_practice': ['description', 'category', 'implementation_guidance'],
    // Default fields for unknown types
    'default': ['description', 'status', 'priority', 'type']
  }

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

      // Parse metadata for extracted entities - all 14 types
      const entities: ExtractedEntities = {
        // Core 14 entity types
        scope_items: metadata?.scope_items || [],
        deliverables: metadata?.deliverables || [],
        requirements: metadata?.requirements || [],
        milestones: metadata?.milestones || [],
        phases: metadata?.phases || [],
        activities: metadata?.activities || [],
        resources: metadata?.resources || [],
        technologies: metadata?.technologies || [],
        stakeholders: metadata?.stakeholders || [],
        constraints: metadata?.constraints || [],
        risks: metadata?.risks || [],
        success_criteria: metadata?.success_criteria || [],
        quality_standards: metadata?.quality_standards || [],
        best_practices: metadata?.best_practices || [],
        
        // Legacy fields for backward compatibility
        assumptions: metadata?.assumptions || [],
        dependencies: metadata?.dependencies || [],
        budget: metadata?.budget || null,
        timeline: metadata?.timeline || null,
        scope: metadata?.scope || null,
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
   * Checks all 14 entity types: scope_items, deliverables, requirements, milestones, 
   * phases, activities, resources, technologies, stakeholders, constraints, risks, 
   * success_criteria, quality_standards, best_practices
   */
  private compareWithBaseline(
    baseline: Baseline,
    currentEntities: ExtractedEntities
  ): DriftPoint[] {
    const driftPoints: DriftPoint[] = []

    // 1. Check scope_items
    if (baseline.scope_baseline?.in_scope_items || baseline.scope_baseline?.out_scope_items) {
      const allBaselineScopeItems = [
        ...(baseline.scope_baseline.in_scope_items || []),
        ...(baseline.scope_baseline.out_scope_items || [])
      ]
      const scopeItemDrift = this.detectGenericEntityDrift(
        'scope_item',
        allBaselineScopeItems,
        currentEntities.scope_items,
        'name'
      )
      driftPoints.push(...scopeItemDrift)
    }

    // 2. Check deliverables
    if (baseline.scope_baseline?.deliverables) {
      const deliverableDrift = this.detectGenericEntityDrift(
        'deliverable',
        baseline.scope_baseline.deliverables,
        currentEntities.deliverables,
        'name'
      )
      driftPoints.push(...deliverableDrift)
    }

    // 3. Check requirements
    if (baseline.scope_baseline?.requirements) {
      const requirementDrift = this.detectGenericEntityDrift(
        'requirement',
        baseline.scope_baseline.requirements,
        currentEntities.requirements,
        'name'
      )
      driftPoints.push(...requirementDrift)
    }

    // 4. Check milestones
    if (baseline.timeline_baseline?.milestones) {
      const milestoneDrift = this.detectMilestoneDrift(
        baseline.timeline_baseline.milestones,
        currentEntities.milestones
      )
      driftPoints.push(...milestoneDrift)
    }

    // 5. Check phases
    if (baseline.timeline_baseline?.phases) {
      const phaseDrift = this.detectGenericEntityDrift(
        'phase',
        baseline.timeline_baseline.phases,
        currentEntities.phases,
        'name'
      )
      driftPoints.push(...phaseDrift)
    }

    // 6. Check activities
    if (baseline.timeline_baseline?.activities) {
      const activityDrift = this.detectGenericEntityDrift(
        'activity',
        baseline.timeline_baseline.activities,
        currentEntities.activities,
        'name'
      )
      driftPoints.push(...activityDrift)
    }

    // 7. Check resources
    if (baseline.resource_baseline?.team_members || baseline.resource_baseline?.equipment) {
      const allBaselineResources = [
        ...(baseline.resource_baseline.team_members || []),
        ...(baseline.resource_baseline.equipment || [])
      ]
      const resourceDrift = this.detectGenericEntityDrift(
        'resource',
        allBaselineResources,
        currentEntities.resources,
        'name'
      )
      driftPoints.push(...resourceDrift)
    }

    // 8. Check technologies
    if (baseline.technical_baseline?.technology_stack) {
      const technologyDrift = this.detectGenericEntityDrift(
        'technology',
        baseline.technical_baseline.technology_stack,
        currentEntities.technologies,
        'name'
      )
      driftPoints.push(...technologyDrift)
    }

    // 9. Check stakeholders
    if (baseline.resource_baseline?.stakeholders) {
      const stakeholderDrift = this.detectStakeholderDrift(
        baseline.resource_baseline.stakeholders,
        currentEntities.stakeholders
      )
      driftPoints.push(...stakeholderDrift)
    }

    // 10. Check constraints
    if (baseline.scope_baseline?.constraints) {
      const constraintDrift = this.detectGenericEntityDrift(
        'constraint',
        baseline.scope_baseline.constraints,
        currentEntities.constraints,
        'name'
      )
      driftPoints.push(...constraintDrift)
    }

    // 11. Check risks
    if (baseline.success_criteria?.risks) {
      const riskDrift = this.detectRiskDrift(
        baseline.success_criteria.risks,
        currentEntities.risks
      )
      driftPoints.push(...riskDrift)
    }

    // 12. Check success_criteria
    if (baseline.success_criteria?.kpis) {
      const successCriteriaDrift = this.detectGenericEntityDrift(
        'success_criterion',
        baseline.success_criteria.kpis,
        currentEntities.success_criteria,
        'metric'
      )
      driftPoints.push(...successCriteriaDrift)
    }

    // 13. Check quality_standards
    if (baseline.technical_baseline?.quality_standards) {
      const qualityStandardDrift = this.detectGenericEntityDrift(
        'quality_standard',
        baseline.technical_baseline.quality_standards,
        currentEntities.quality_standards,
        'name'
      )
      driftPoints.push(...qualityStandardDrift)
    }

    // 14. Check best_practices
    if (baseline.technical_baseline?.best_practices) {
      const bestPracticeDrift = this.detectGenericEntityDrift(
        'best_practice',
        baseline.technical_baseline.best_practices,
        currentEntities.best_practices,
        'title'
      )
      driftPoints.push(...bestPracticeDrift)
    }

    // Check budget (legacy support)
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
   * Generic entity drift detection
   * Works for: scope_items, deliverables, requirements, phases, activities,
   * resources, technologies, constraints, success_criteria, quality_standards, best_practices
   * 
   * Optimized with O(n) lookups using Map instead of O(n²) array.find()
   * 
   * @param entityType - Type of entity (e.g., 'deliverable', 'requirement')
   * @param baselineEntities - Entities from baseline
   * @param currentEntities - Entities from current document
   * @param nameField - Field to use for matching (e.g., 'name', 'title', 'metric')
   */
  private detectGenericEntityDrift(
    entityType: string,
    baselineEntities: any[],
    currentEntities: any[],
    nameField: string = 'name'
  ): DriftPoint[] {
    const drift: DriftPoint[] = []

    // Build Map of current entities for O(1) lookups - optimizes from O(n²) to O(n)
    const currentEntitiesMap = new Map<string, any>()
    for (const current of currentEntities) {
      const currentName = current[nameField] || current.name || current.title
      if (currentName) {
        currentEntitiesMap.set(this.normalizeString(currentName), current)
      }
    }

    // Build Map of baseline entities for O(1) lookups
    const baselineEntitiesMap = new Map<string, any>()
    for (const baseline of baselineEntities) {
      const baselineName = baseline[nameField] || baseline.name || baseline.title
      if (baselineName) {
        baselineEntitiesMap.set(this.normalizeString(baselineName), baseline)
      }
    }

    // Check for removed entities
    for (const [normalizedName, baseline] of baselineEntitiesMap) {
      if (!currentEntitiesMap.has(normalizedName)) {
        const baselineName = baseline[nameField] || baseline.name || baseline.title
        drift.push({
          entityType,
          driftType: 'removed',
          baselineValue: baseline,
          currentValue: null,
          description: `${this.capitalize(entityType)} removed: "${baselineName}"`,
          requiresApproval: this.requiresApprovalForRemoval(entityType, baseline)
        })
      }
    }

    // Check for added entities
    for (const [normalizedName, current] of currentEntitiesMap) {
      if (!baselineEntitiesMap.has(normalizedName)) {
        const currentName = current[nameField] || current.name || current.title
        drift.push({
          entityType,
          driftType: 'added',
          baselineValue: null,
          currentValue: current,
          description: `New ${entityType} added: "${currentName}"`,
          requiresApproval: this.requiresApprovalForAddition(entityType, current)
        })
      }
    }

    // Check for modifications
    for (const [normalizedName, current] of currentEntitiesMap) {
      const baseline = baselineEntitiesMap.get(normalizedName)
      if (baseline && this.hasEntityChanged(entityType, baseline, current)) {
        const currentName = current[nameField] || current.name || current.title
        drift.push({
          entityType,
          driftType: 'modified',
          baselineValue: baseline,
          currentValue: current,
          description: `${this.capitalize(entityType)} modified: "${currentName}"`,
          requiresApproval: this.requiresApprovalForModification(entityType, baseline, current)
        })
      }
    }

    return drift
  }

  /**
   * Check if an entity has changed (uses entity-type specific field comparison)
   */
  private hasEntityChanged(entityType: string, baseline: any, current: any): boolean {
    // Get fields to compare for this entity type
    const fieldsToCompare = this.ENTITY_COMPARISON_FIELDS[entityType] || this.ENTITY_COMPARISON_FIELDS['default']
    
    // Compare each relevant field
    for (const field of fieldsToCompare) {
      if (baseline[field] !== undefined && current[field] !== undefined) {
        if (baseline[field] !== current[field]) {
          return true
        }
      }
    }
    
    return false
  }

  /**
   * Determine if removal requires approval
   */
  private requiresApprovalForRemoval(entityType: string, entity: any): boolean {
    // High-priority removals require approval
    if (entity.priority === 'high' || entity.priority === 'critical') return true
    
    // Critical entity types always require approval for removal
    const criticalTypes = ['milestone', 'deliverable', 'requirement', 'success_criterion']
    if (criticalTypes.includes(entityType)) return true
    
    return false
  }

  /**
   * Determine if addition requires approval
   */
  private requiresApprovalForAddition(entityType: string, entity: any): boolean {
    // High-priority additions require approval
    if (entity.priority === 'high' || entity.priority === 'critical') return true
    
    // High-impact additions require approval
    if (entity.impact === 'high' || entity.impact === 'critical') return true
    
    // Critical entity types require approval for additions
    const criticalTypes = ['deliverable', 'requirement']
    if (criticalTypes.includes(entityType)) return true
    
    return false
  }

  /**
   * Determine if modification requires approval
   */
  private requiresApprovalForModification(entityType: string, baseline: any, current: any): boolean {
    // Status changes from 'approved' require approval
    if (baseline.status === 'approved' && current.status !== 'approved') return true
    
    // Priority increases require approval
    if (baseline.priority && current.priority) {
      const baselinePriority = this.PRIORITY_LEVELS[baseline.priority as keyof typeof this.PRIORITY_LEVELS] || 0
      const currentPriority = this.PRIORITY_LEVELS[current.priority as keyof typeof this.PRIORITY_LEVELS] || 0
      if (currentPriority > baselinePriority) return true
    }
    
    return false
  }

  /**
   * Capitalize first letter of string
   */
  private capitalize(str: string): string {
    if (!str) return ''
    return str.charAt(0).toUpperCase() + str.slice(1)
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
}

// Export singleton instance
export const driftDetectionService = new DriftDetectionService()
