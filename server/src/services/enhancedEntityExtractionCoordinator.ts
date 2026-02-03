/**
 * Enhanced Entity Extraction Coordinator
 * Coordinates all enhanced extraction services with location tracking
 * Provides a unified interface for extracting entities with precise source document positions
 */

import { logger } from '../utils/logger'
import { EnhancedPerformanceActualsExtractionService, ExtractedPerformanceActual } from './enhancedPerformanceActualsExtractionService'
import { EnhancedRequirementsExtractionService, ExtractedRequirement } from './enhancedRequirementsExtractionService'
import { TaskExtractionService, ExtractedTask } from './taskExtractionService'
import { RiskManagementExtractionService, ExtractedRisk, ExtractedMitigation, ExtractedIssue, ExtractedPlaybook } from './riskManagementExtractionService'
import { HighImpactEntitiesExtractionService, ExtractedDeliverable, ExtractedStakeholder, ExtractedResource, ExtractedMilestone } from './highImpactEntitiesExtractionService'
import { ProjectStructureExtractionService, ExtractedWorkItem, ExtractedSuccessCriterion, ExtractedConstraint, ExtractedScopeItem } from './projectStructureExtractionService'
import { ProjectExecutionExtractionService, ExtractedActivity, ExtractedPhase, ExtractedOpportunity } from './projectExecutionExtractionService'
import { QualityTemplatesExtractionService, ExtractedQualityAudit, ExtractedBestPractice, ExtractedTemplateImprovement } from './qualityTemplatesExtractionService'

export interface EnhancedExtractionResults {
  performance_actuals: ExtractedPerformanceActual[]
  requirements: ExtractedRequirement[]
  tasks: ExtractedTask[]
  risks: ExtractedRisk[]
  mitigations: ExtractedMitigation[]
  issues: ExtractedIssue[]
  playbooks: ExtractedPlaybook[]
  deliverables: ExtractedDeliverable[]
  stakeholders: ExtractedStakeholder[]
  resources: ExtractedResource[]
  milestones: ExtractedMilestone[]
  work_items: ExtractedWorkItem[]
  success_criteria: ExtractedSuccessCriterion[]
  constraints: ExtractedConstraint[]
  scope_items: ExtractedScopeItem[]
  activities: ExtractedActivity[]
  phases: ExtractedPhase[]
  opportunities: ExtractedOpportunity[]
  quality_audits: ExtractedQualityAudit[]
  best_practices: ExtractedBestPractice[]
  template_improvements: ExtractedTemplateImprovement[]
}

export class EnhancedEntityExtractionCoordinator {
  private performanceActualsService: EnhancedPerformanceActualsExtractionService
  private requirementsService: EnhancedRequirementsExtractionService
  private taskService: TaskExtractionService
  private riskManagementService: RiskManagementExtractionService
  private highImpactEntitiesService: HighImpactEntitiesExtractionService
  private projectStructureService: ProjectStructureExtractionService
  private projectExecutionService: ProjectExecutionExtractionService
  private qualityTemplatesService: QualityTemplatesExtractionService

  constructor() {
    this.performanceActualsService = new EnhancedPerformanceActualsExtractionService()
    this.requirementsService = new EnhancedRequirementsExtractionService()
    this.taskService = new TaskExtractionService()
    this.riskManagementService = new RiskManagementExtractionService()
    this.highImpactEntitiesService = new HighImpactEntitiesExtractionService()
    this.projectStructureService = new ProjectStructureExtractionService()
    this.projectExecutionService = new ProjectExecutionExtractionService()
    this.qualityTemplatesService = new QualityTemplatesExtractionService()
  }

  /**
   * Extract all entities with location tracking
   */
  async extractAllEntitiesWithLocations(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { 
      aiProvider?: string
      aiModel?: string
      entityTypes?: string[] // Optional: specify which entity types to extract
    }
  ): Promise<EnhancedExtractionResults> {
    try {
      logger.info(`[ENHANCED-EXTRACTION-COORDINATOR] Starting comprehensive extraction with location tracking`)
      const startTime = Date.now()

      // Default to all entity types if not specified
      const entityTypesToExtract = options.entityTypes || [
        'performance_actuals', 'requirements', 'tasks', 'risks', 'mitigations', 'issues',
        'playbooks', 'deliverables', 'stakeholders', 'resources', 'milestones',
        'work_items', 'success_criteria', 'constraints', 'scope_items',
        'activities', 'phases', 'opportunities', 'quality_audits', 'best_practices', 'template_improvements'
      ]

      // Prepare extraction promises based on requested entity types
      const extractionPromises: Promise<any>[] = []

      if (entityTypesToExtract.includes('performance_actuals')) {
        extractionPromises.push(
          this.performanceActualsService.extractPerformanceActualsWithLocations(documents, projectId, options)
            .then(results => ({ performance_actuals: results }))
        )
      }

      if (entityTypesToExtract.includes('requirements')) {
        extractionPromises.push(
          this.requirementsService.extractRequirementsWithLocations(documents, projectId, options)
            .then(results => ({ requirements: results }))
        )
      }

      if (entityTypesToExtract.includes('tasks')) {
        extractionPromises.push(
          this.taskService.extractTasksWithLocations(documents, projectId, options)
            .then(results => ({ tasks: results }))
        )
      }

      if (entityTypesToExtract.includes('risks') || entityTypesToExtract.includes('mitigations') || 
          entityTypesToExtract.includes('issues') || entityTypesToExtract.includes('playbooks')) {
        extractionPromises.push(
          this.riskManagementService.extractRiskManagementWithLocations(documents, projectId, options)
            .then(results => ({
              risks: results.risks || [],
              mitigations: results.mitigations || [],
              issues: results.issues || [],
              playbooks: results.playbooks || []
            }))
        )
      }

      if (entityTypesToExtract.includes('deliverables') || entityTypesToExtract.includes('stakeholders') || 
          entityTypesToExtract.includes('resources') || entityTypesToExtract.includes('milestones')) {
        extractionPromises.push(
          this.highImpactEntitiesService.extractHighImpactEntitiesWithLocations(documents, projectId, options)
            .then(results => ({
              deliverables: results.deliverables || [],
              stakeholders: results.stakeholders || [],
              resources: results.resources || [],
              milestones: results.milestones || []
            }))
        )
      }

      if (entityTypesToExtract.includes('work_items') || entityTypesToExtract.includes('success_criteria') || 
          entityTypesToExtract.includes('constraints') || entityTypesToExtract.includes('scope_items')) {
        extractionPromises.push(
          this.projectStructureService.extractProjectStructureWithLocations(documents, projectId, options)
            .then(results => ({
              work_items: results.work_items || [],
              success_criteria: results.success_criteria || [],
              constraints: results.constraints || [],
              scope_items: results.scope_items || []
            }))
        )
      }

      if (entityTypesToExtract.includes('activities') || entityTypesToExtract.includes('phases') || 
          entityTypesToExtract.includes('opportunities')) {
        extractionPromises.push(
          this.projectExecutionService.extractProjectExecutionWithLocations(documents, projectId, options)
            .then(results => ({
              activities: results.activities || [],
              phases: results.phases || [],
              opportunities: results.opportunities || []
            }))
        )
      }

      if (entityTypesToExtract.includes('quality_audits') || entityTypesToExtract.includes('best_practices') || 
          entityTypesToExtract.includes('template_improvements')) {
        extractionPromises.push(
          this.qualityTemplatesService.extractQualityTemplatesWithLocations(documents, projectId, options)
            .then(results => ({
              quality_audits: results.quality_audits || [],
              best_practices: results.best_practices || [],
              template_improvements: results.template_improvements || []
            }))
        )
      }

      // Execute all extractions in parallel
      const results = await Promise.all(extractionPromises)

      // Merge all results
      const mergedResults: EnhancedExtractionResults = {
        performance_actuals: [],
        requirements: [],
        tasks: [],
        risks: [],
        mitigations: [],
        issues: [],
        playbooks: [],
        deliverables: [],
        stakeholders: [],
        resources: [],
        milestones: [],
        work_items: [],
        success_criteria: [],
        constraints: [],
        scope_items: [],
        activities: [],
        phases: [],
        opportunities: [],
        quality_audits: [],
        best_practices: [],
        template_improvements: []
      }

      results.forEach(result => {
        Object.assign(mergedResults, result)
      })

      const extractionTime = Date.now() - startTime
      const totalEntities = Object.values(mergedResults).reduce((sum, entities) => sum + entities.length, 0)

      logger.info(`[ENHANCED-EXTRACTION-COORDINATOR] Extraction completed in ${extractionTime}ms`)
      logger.info(`[ENHANCED-EXTRACTION-COORDINATOR] Total entities extracted: ${totalEntities}`)

      // Log breakdown by entity type
      Object.entries(mergedResults).forEach(([entityType, entities]) => {
        if (entities.length > 0) {
          logger.info(`[ENHANCED-EXTRACTION-COORDINATOR] ${entityType}: ${entities.length} entities`)
        }
      })

      return mergedResults

    } catch (error) {
      logger.error(`[ENHANCED-EXTRACTION-COORDINATOR] Comprehensive extraction failed`, {
        error: error instanceof Error ? error.message : String(error)
      })
      
      // Return empty results on error
      return {
        performance_actuals: [],
        requirements: [],
        tasks: [],
        risks: [],
        mitigations: [],
        issues: [],
        playbooks: [],
        deliverables: [],
        stakeholders: [],
        resources: [],
        milestones: [],
        work_items: [],
        success_criteria: [],
        constraints: [],
        scope_items: [],
        activities: [],
        phases: [],
        opportunities: [],
        quality_audits: [],
        best_practices: [],
        template_improvements: []
      }
    }
  }

  /**
   * Extract specific entity types with location tracking
   */
  async extractSpecificEntitiesWithLocations(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    entityTypes: string[],
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<Partial<EnhancedExtractionResults>> {
    return this.extractAllEntitiesWithLocations(documents, projectId, { ...options, entityTypes })
  }

  /**
   * Get extraction statistics
   */
  getExtractionStats(results: EnhancedExtractionResults): {
    totalEntities: number
    entitiesByType: Record<string, number>
    entitiesWithLocations: number
  } {
    const entitiesByType: Record<string, number> = {}
    let entitiesWithLocations = 0

    Object.entries(results).forEach(([entityType, entities]) => {
      entitiesByType[entityType] = entities.length
      
      // Count entities with location data
      entitiesWithLocations += entities.filter(entity => 
        entity.source_text_start !== undefined && 
        entity.source_text_end !== undefined
      ).length
    })

    const totalEntities = Object.values(entitiesByType).reduce((sum, count) => sum + count, 0)

    return {
      totalEntities,
      entitiesByType,
      entitiesWithLocations
    }
  }
}
