/**
 * Extraction Registry
 * 
 * Maps entity types to their extract and save functions.
 * Supports feature flags for per-entity rollout and rollback.
 */

import { logger } from '../../utils/logger'
import type { ExtractionContext } from './base/ExtractionContext'
import type { ExtractionResult } from './base/ExtractionResult'
import type { PersistenceResult } from './base/Persistence'
import type { PoolClient } from 'pg'

/**
 * Entity extractor function signature
 */
export type EntityExtractor<T = any> = (
  context: ExtractionContext,
  options?: { temperature?: number; maxTokens?: number }
) => Promise<ExtractionResult<T>>

/**
 * Entity saver function signature
 */
export type EntitySaver<T = any> = (
  client: PoolClient,
  projectId: string,
  userId: string,
  entities: T[]
) => Promise<PersistenceResult>

/**
 * Entity module definition
 */
export interface EntityModule<T = any> {
  extract: EntityExtractor<T>
  save: EntitySaver<T>
}

/**
 * Feature flag configuration
 */
interface FeatureFlags {
  [entityType: string]: boolean
}

/**
 * Extraction Registry
 * 
 * Manages entity extractors and savers with feature flag support.
 */
export class ExtractionRegistry {
  private modules = new Map<string, EntityModule>()
  private featureFlags: FeatureFlags = {}

  /**
   * Register an entity module
   */
  register<T = any>(entityType: string, module: EntityModule<T>): void {
    this.modules.set(entityType, module)
    logger.debug(`[EXTRACTION-REGISTRY] Registered entity module: ${entityType}`)
  }

  /**
   * Get extractor for entity type
   */
  getExtractor(entityType: string): EntityExtractor | null {
    const module = this.modules.get(entityType)
    return module?.extract || null
  }

  /**
   * Get saver for entity type
   */
  getSaver(entityType: string): EntitySaver | null {
    const module = this.modules.get(entityType)
    return module?.save || null
  }

  /**
   * Check if entity type is registered
   */
  hasEntity(entityType: string): boolean {
    return this.modules.has(entityType)
  }

  /**
   * Check if entity type is enabled via feature flag
   */
  isEnabled(entityType: string): boolean {
    // If no feature flag set, default to enabled (for backward compatibility)
    if (!(entityType in this.featureFlags)) {
      return true
    }
    return this.featureFlags[entityType] === true
  }

  /**
   * Enable feature flag for entity type
   */
  enableFeature(entityType: string): void {
    this.featureFlags[entityType] = true
    logger.info(`[EXTRACTION-REGISTRY] Enabled feature flag for: ${entityType}`)
  }

  /**
   * Disable feature flag for entity type
   */
  disableFeature(entityType: string): void {
    this.featureFlags[entityType] = false
    logger.info(`[EXTRACTION-REGISTRY] Disabled feature flag for: ${entityType}`)
  }

  /**
   * Set feature flag from environment variable
   */
  setFeatureFlagFromEnv(entityType: string): void {
    const envKey = `EXTRACTION_USE_NEW_${entityType.toUpperCase().replace(/-/g, '_')}`
    const envValue = process.env[envKey]

    if (envValue !== undefined) {
      this.featureFlags[entityType] = envValue === 'true' || envValue === '1'
      logger.info(`[EXTRACTION-REGISTRY] Feature flag for ${entityType} set from ${envKey}=${envValue}`)
    }
  }

  /**
   * Get all registered entity types
   */
  getRegisteredEntities(): string[] {
    return Array.from(this.modules.keys())
  }

  /**
   * Get feature flag status for all entities
   */
  getFeatureFlags(): FeatureFlags {
    return { ...this.featureFlags }
  }
}

/**
 * Global registry instance
 */
export const extractionRegistry = new ExtractionRegistry()

/**
 * Initialize registry with entity modules
 */
export async function initializeRegistry(): Promise<void> {
  // Register work_items module (Phase 2)
  const { extractWorkItems, saveWorkItems } = await import('./entities/work_items')
  extractionRegistry.register('work_items', {
    extract: extractWorkItems,
    save: saveWorkItems
  })

  // Register capacity_plans module (Phase 4)
  const { extractCapacityPlans, saveCapacityPlans } = await import('./entities/capacity_plans')
  extractionRegistry.register('capacity_plans', {
    extract: extractCapacityPlans,
    save: saveCapacityPlans
  })

  // Register performance_measurements module (Phase 5)
  const { extractPerformanceMeasurements, savePerformanceMeasurements } = await import('./entities/performance_measurements')
  extractionRegistry.register('performance_measurements', {
    extract: extractPerformanceMeasurements,
    save: savePerformanceMeasurements
  })

  // Register earned_value_metrics module (Phase 5)
  const { extractEarnedValueMetrics, saveEarnedValueMetrics } = await import('./entities/earned_value_metrics')
  extractionRegistry.register('earned_value_metrics', {
    extract: extractEarnedValueMetrics,
    save: saveEarnedValueMetrics
  })

  // Register opportunities module (Phase 5)
  const { extractOpportunities, saveOpportunities } = await import('./entities/opportunities')
  extractionRegistry.register('opportunities', {
    extract: extractOpportunities,
    save: saveOpportunities
  })

  // Register risk_responses module (Phase 5)
  const { extractRiskResponses, saveRiskResponses } = await import('./entities/risk_responses')
  extractionRegistry.register('risk_responses', {
    extract: extractRiskResponses,
    save: saveRiskResponses
  })

  // Register performance_actuals module (Phase 5)
  const { extractPerformanceActuals, savePerformanceActuals } = await import('./entities/performance_actuals')
  extractionRegistry.register('performance_actuals', {
    extract: extractPerformanceActuals,
    save: savePerformanceActuals
  })

  // Register stakeholders module (Phase 6 - Core Entities)
  const { extractStakeholders, saveStakeholders } = await import('./entities/stakeholders')
  extractionRegistry.register('stakeholders', {
    extract: extractStakeholders,
    save: saveStakeholders
  })

  // Register requirements module (Phase 6 - Core Entities)
  const { extractRequirements, saveRequirements } = await import('./entities/requirements')
  extractionRegistry.register('requirements', {
    extract: extractRequirements,
    save: saveRequirements
  })

  // Register risks module (Phase 6 - Core Entities)
  const { extractRisks, saveRisks } = await import('./entities/risks')
  extractionRegistry.register('risks', {
    extract: extractRisks,
    save: saveRisks
  })

  // Register milestones module (Phase 6 - Core Entities)
  const { extractMilestones, saveMilestones } = await import('./entities/milestones')
  extractionRegistry.register('milestones', {
    extract: extractMilestones,
    save: saveMilestones
  })

  // Register constraints module (Phase 6 - Core Entities)
  const { extractConstraints, saveConstraints } = await import('./entities/constraints')
  extractionRegistry.register('constraints', {
    extract: extractConstraints,
    save: saveConstraints
  })

  // Register activities module (Phase 6 - Core Entities)
  const { extractActivities, saveActivities } = await import('./entities/activities')
  extractionRegistry.register('activities', {
    extract: extractActivities,
    save: saveActivities
  })

  // Register deliverables module (Phase 6 - Core Entities)
  const { extractDeliverables, saveDeliverables } = await import('./entities/deliverables')
  extractionRegistry.register('deliverables', {
    extract: extractDeliverables,
    save: saveDeliverables
  })

  // Register scope_items module (Phase 6 - Core Entities)
  const { extractScopeItems, saveScopeItems } = await import('./entities/scope_items')
  extractionRegistry.register('scope_items', {
    extract: extractScopeItems,
    save: saveScopeItems
  })

  // Register success_criteria module (Phase 6 - Core Entities - FINAL)
  const { extractSuccessCriteria, saveSuccessCriteria } = await import('./entities/success_criteria')
  extractionRegistry.register('success_criteria', {
    extract: extractSuccessCriteria,
    save: saveSuccessCriteria
  })

  // Register phases module (Phase 7 - Project Phases & Iterations)
  const { extractPhases, savePhases } = await import('./entities/phases')
  extractionRegistry.register('phases', {
    extract: extractPhases,
    save: savePhases
  })

  // Register project_iterations module (Phase 7 - Project Phases & Iterations)
  const { extractProjectIterations, saveProjectIterations } = await import('./entities/project_iterations')
  extractionRegistry.register('project_iterations', {
    extract: extractProjectIterations,
    save: saveProjectIterations
  })

  // Register best_practices module (Phase 8 - Tier 2 / Quality & Compliance)
  const { extractBestPractices, saveBestPractices } = await import('./entities/best_practices')
  extractionRegistry.register('best_practices', {
    extract: extractBestPractices,
    save: saveBestPractices
  })

  // Register resources module (Phase 8 - Tier 2 / Resource Management)
  const { extractResources, saveResources } = await import('./entities/resources')
  extractionRegistry.register('resources', {
    extract: extractResources,
    save: saveResources
  })

  // Register technologies module (Phase 8 - Tier 2 / Knowledge & Technology)
  const { extractTechnologies, saveTechnologies } = await import('./entities/technologies')
  extractionRegistry.register('technologies', {
    extract: extractTechnologies,
    save: saveTechnologies
  })

  // Register quality_standards module (Phase 8 - Tier 2 / Quality & Compliance)
  const { extractQualityStandards, saveQualityStandards } = await import('./entities/quality_standards')
  extractionRegistry.register('quality_standards', {
    extract: extractQualityStandards,
    save: saveQualityStandards
  })

  // Register team_agreements module (Phase 8 - Tier 2 / Team Performance Domain)
  const { extractTeamAgreements, saveTeamAgreements } = await import('./entities/team_agreements')
  extractionRegistry.register('team_agreements', {
    extract: extractTeamAgreements,
    save: saveTeamAgreements
  })

  // Register development_approaches module (Phase 8 - Tier 2 / Development Approach & Life Cycle Domain)
  const { extractDevelopmentApproaches, saveDevelopmentApproaches } = await import('./entities/development_approaches')
  extractionRegistry.register('development_approaches', {
    extract: extractDevelopmentApproaches,
    save: saveDevelopmentApproaches
  })

  // Register governance_decisions module (Phase 1 - Governance)
  const { extractGovernanceDecisions, saveGovernanceDecisions } = await import('./entities/governance_decisions')
  extractionRegistry.register('governance_decisions', {
    extract: extractGovernanceDecisions,
    save: saveGovernanceDecisions
  })

  // Register approval_workflows module (Phase 1 - Governance)
  const { extractApprovalWorkflows, saveApprovalWorkflows } = await import('./entities/approval_workflows')
  extractionRegistry.register('approval_workflows', {
    extract: extractApprovalWorkflows,
    save: saveApprovalWorkflows
  })

  // Register steering_committees module (Phase 1 - Governance)
  const { extractSteeringCommittees, saveSteeringCommittees } = await import('./entities/steering_committees')
  extractionRegistry.register('steering_committees', {
    extract: extractSteeringCommittees,
    save: saveSteeringCommittees
  })

  // Register change_control_boards module (Phase 1 - Governance)
  const { extractChangeControlBoards, saveChangeControlBoards } = await import('./entities/change_control_boards')
  extractionRegistry.register('change_control_boards', {
    extract: extractChangeControlBoards,
    save: saveChangeControlBoards
  })

  // Register policy_compliance module (Phase 1 - Governance)
  const { extractPolicyCompliance, savePolicyCompliance } = await import('./entities/policy_compliance')
  extractionRegistry.register('policy_compliance', {
    extract: extractPolicyCompliance,
    save: savePolicyCompliance
  })

  // Register scope_baseline module (Phase 1 - Scope)
  const { extractScopeBaseline, saveScopeBaseline } = await import('./entities/scope_baseline')
  extractionRegistry.register('scope_baseline', {
    extract: extractScopeBaseline,
    save: saveScopeBaseline
  })

  // Register wbs_nodes module (Phase 1 - Scope)
  const { extractWBSNodes, saveWBSNodes } = await import('./entities/wbs_nodes')
  extractionRegistry.register('wbs_nodes', {
    extract: extractWBSNodes,
    save: saveWBSNodes
  })

  // Register scope_change_requests module (Phase 1 - Scope)
  const { extractScopeChangeRequests, saveScopeChangeRequests } = await import('./entities/scope_change_requests')
  extractionRegistry.register('scope_change_requests', {
    extract: extractScopeChangeRequests,
    save: saveScopeChangeRequests
  })

  // Register requirements_traceability module (Phase 1 - Scope)
  const { extractRequirementsTraceability, saveRequirementsTraceability } = await import('./entities/requirements_traceability')
  extractionRegistry.register('requirements_traceability', {
    extract: extractRequirementsTraceability,
    save: saveRequirementsTraceability
  })

  // Register scope_verification module (Phase 1 - Scope)
  const { extractScopeVerification, saveScopeVerification } = await import('./entities/scope_verification')
  extractionRegistry.register('scope_verification', {
    extract: extractScopeVerification,
    save: saveScopeVerification
  })

  // Register dt_assets module (Digital Twin - extract from L0 YAML, save to extracted_dt_assets)
  const { extractDtAssets, saveDtAssets } = await import('./entities/dt_assets')
  extractionRegistry.register('dt_assets', {
    extract: extractDtAssets,
    save: saveDtAssets
  })

  // Register schedule_baseline module (Phase 2 - Schedule)
  const { extractScheduleBaseline, saveScheduleBaseline } = await import('./entities/schedule_baseline')
  extractionRegistry.register('schedule_baseline', {
    extract: extractScheduleBaseline,
    save: saveScheduleBaseline
  })

  // Register schedule_activities module (Phase 2 - Schedule)
  const { extractScheduleActivities, saveScheduleActivities } = await import('./entities/schedule_activities')
  extractionRegistry.register('schedule_activities', {
    extract: extractScheduleActivities,
    save: saveScheduleActivities
  })

  // Register critical_path module (Phase 2 - Schedule)
  const { extractCriticalPath, saveCriticalPath } = await import('./entities/critical_path')
  extractionRegistry.register('critical_path', {
    extract: extractCriticalPath,
    save: saveCriticalPath
  })

  // Register schedule_variances module (Phase 2 - Schedule)
  const { extractScheduleVariances, saveScheduleVariances } = await import('./entities/schedule_variances')
  extractionRegistry.register('schedule_variances', {
    extract: extractScheduleVariances,
    save: saveScheduleVariances
  })

  // Register schedule_forecasts module (Phase 2 - Schedule)
  const { extractScheduleForecasts, saveScheduleForecasts } = await import('./entities/schedule_forecasts')
  extractionRegistry.register('schedule_forecasts', {
    extract: extractScheduleForecasts,
    save: saveScheduleForecasts
  })

  // Register budget_baseline module (Phase 2 - Finance)
  const { extractBudgetBaseline, saveBudgetBaseline } = await import('./entities/budget_baseline')
  extractionRegistry.register('budget_baseline', {
    extract: extractBudgetBaseline,
    save: saveBudgetBaseline
  })

  // Register cost_estimates module (Phase 2 - Finance)
  const { extractCostEstimates, saveCostEstimates } = await import('./entities/cost_estimates')
  extractionRegistry.register('cost_estimates', {
    extract: extractCostEstimates,
    save: saveCostEstimates
  })

  // Register funding_tranches module (Phase 2 - Finance)
  const { extractFundingTranches, saveFundingTranches } = await import('./entities/funding_tranches')
  extractionRegistry.register('funding_tranches', {
    extract: extractFundingTranches,
    save: saveFundingTranches
  })

  // Register financial_variances module (Phase 2 - Finance)
  const { extractFinancialVariances, saveFinancialVariances } = await import('./entities/financial_variances')
  extractionRegistry.register('financial_variances', {
    extract: extractFinancialVariances,
    save: saveFinancialVariances
  })

  // Register procurement_costs module (Phase 2 - Finance)
  const { extractProcurementCosts, saveProcurementCosts } = await import('./entities/procurement_costs')
  extractionRegistry.register('procurement_costs', {
    extract: extractProcurementCosts,
    save: saveProcurementCosts
  })

  // Register resource_plans module (Phase 3 - Resources)
  const { extractResourcePlans, saveResourcePlans } = await import('./entities/resource_plans')
  extractionRegistry.register('resource_plans', {
    extract: extractResourcePlans,
    save: saveResourcePlans
  })

  // Register roles_and_responsibilities module (Phase 3 - Resources)
  const { extractRolesAndResponsibilities, saveRolesAndResponsibilities } = await import('./entities/roles_and_responsibilities')
  extractionRegistry.register('roles_and_responsibilities', {
    extract: extractRolesAndResponsibilities,
    save: saveRolesAndResponsibilities
  })

  // Register team_availability module (Phase 3 - Resources)
  const { extractTeamAvailability, saveTeamAvailability } = await import('./entities/team_availability')
  extractionRegistry.register('team_availability', {
    extract: extractTeamAvailability,
    save: saveTeamAvailability
  })

  // Register labor_rates module (Phase 3 - Resources)
  const { extractLaborRates, saveLaborRates } = await import('./entities/labor_rates')
  extractionRegistry.register('labor_rates', {
    extract: extractLaborRates,
    save: saveLaborRates
  })

  // Register project_org_chart module (Phase 3 - Resources)
  const { extractProjectOrgChart, saveProjectOrgChart } = await import('./entities/project_org_chart')
  extractionRegistry.register('project_org_chart', {
    extract: extractProjectOrgChart,
    save: saveProjectOrgChart
  })

  // Register risk_appetite module (Phase 3 - Risk Extensions)
  const { extractRiskAppetite, saveRiskAppetite } = await import('./entities/risk_appetite')
  extractionRegistry.register('risk_appetite', {
    extract: extractRiskAppetite,
    save: saveRiskAppetite
  })

  // Register risk_checklists module (Phase 3 - Risk Extensions)
  const { extractRiskChecklists, saveRiskChecklists } = await import('./entities/risk_checklists')
  extractionRegistry.register('risk_checklists', {
    extract: extractRiskChecklists,
    save: saveRiskChecklists
  })

  // Register probability_impact_matrix module (Phase 3 - Risk Extensions)
  const { extractProbabilityImpactMatrix, saveProbabilityImpactMatrix } = await import('./entities/probability_impact_matrix')
  extractionRegistry.register('probability_impact_matrix', {
    extract: extractProbabilityImpactMatrix,
    save: saveProbabilityImpactMatrix
  })

  // Register issue_log module (Phase 3 - Issues)
  const { extractIssueLog, saveIssueLog } = await import('./entities/issue_log')
  extractionRegistry.register('issue_log', {
    extract: extractIssueLog,
    save: saveIssueLog
  })

  // Register lessons_learned module (Phase 3 - Knowledge)
  const { extractLessonsLearned, saveLessonsLearned } = await import('./entities/lessons_learned')
  extractionRegistry.register('lessons_learned', {
    extract: extractLessonsLearned,
    save: saveLessonsLearned
  })

  // Register stakeholder_engagements module (Phase 4 - Stakeholder Ops)
  const { extractStakeholderEngagements, saveStakeholderEngagements } = await import('./entities/stakeholder_engagements')
  extractionRegistry.register('stakeholder_engagements', {
    extract: extractStakeholderEngagements,
    save: saveStakeholderEngagements
  })

  // Register communication_logs module (Phase 4 - Stakeholder Ops)
  const { extractCommunicationLogs, saveCommunicationLogs } = await import('./entities/communication_logs')
  extractionRegistry.register('communication_logs', {
    extract: extractCommunicationLogs,
    save: saveCommunicationLogs
  })

  // Register action_items module (Phase 4 - Stakeholder Ops)
  const { extractActionItems, saveActionItems } = await import('./entities/action_items')
  extractionRegistry.register('action_items', {
    extract: extractActionItems,
    save: saveActionItems
  })

  // Register meeting_minutes module (Phase 4 - Stakeholder Ops)
  const { extractMeetingMinutes, saveMeetingMinutes } = await import('./entities/meeting_minutes')
  extractionRegistry.register('meeting_minutes', {
    extract: extractMeetingMinutes,
    save: saveMeetingMinutes
  })

  // Register project_charter_details module (Phase 4 - Strategy)
  const { extractProjectCharterDetails, saveProjectCharterDetails } = await import('./entities/project_charter_details')
  extractionRegistry.register('project_charter_details', {
    extract: extractProjectCharterDetails,
    save: saveProjectCharterDetails
  })

  // Register business_case_details module (Phase 4 - Strategy)
  const { extractBusinessCaseDetails, saveBusinessCaseDetails } = await import('./entities/business_case_details')
  extractionRegistry.register('business_case_details', {
    extract: extractBusinessCaseDetails,
    save: saveBusinessCaseDetails
  })

  // Register benefit_realization_plan module (Phase 4 - Strategy)
  const { extractBenefitRealizationPlan, saveBenefitRealizationPlan } = await import('./entities/benefit_realization_plan')
  extractionRegistry.register('benefit_realization_plan', {
    extract: extractBenefitRealizationPlan,
    save: saveBenefitRealizationPlan
  })

  // Register general_change_requests module (Phase 4 - Strategy)
  const { extractGeneralChangeRequests, saveGeneralChangeRequests } = await import('./entities/general_change_requests')
  extractionRegistry.register('general_change_requests', {
    extract: extractGeneralChangeRequests,
    save: saveGeneralChangeRequests
  })

  // Register project_team_evaluations module (Phase 4 - Strategy)
  const { extractProjectTeamEvaluations, saveProjectTeamEvaluations } = await import('./entities/project_team_evaluations')
  extractionRegistry.register('project_team_evaluations', {
    extract: extractProjectTeamEvaluations,
    save: saveProjectTeamEvaluations
  })

  // Load feature flags from environment
  extractionRegistry.setFeatureFlagFromEnv('work_items')
  extractionRegistry.setFeatureFlagFromEnv('capacity_plans')
  extractionRegistry.setFeatureFlagFromEnv('performance_measurements')
  extractionRegistry.setFeatureFlagFromEnv('earned_value_metrics')
  extractionRegistry.setFeatureFlagFromEnv('opportunities')
  extractionRegistry.setFeatureFlagFromEnv('risk_responses')
  extractionRegistry.setFeatureFlagFromEnv('performance_actuals')
  extractionRegistry.setFeatureFlagFromEnv('stakeholders')
  extractionRegistry.setFeatureFlagFromEnv('requirements')
  extractionRegistry.setFeatureFlagFromEnv('risks')
  extractionRegistry.setFeatureFlagFromEnv('milestones')
  extractionRegistry.setFeatureFlagFromEnv('constraints')
  extractionRegistry.setFeatureFlagFromEnv('activities')
  extractionRegistry.setFeatureFlagFromEnv('deliverables')
  extractionRegistry.setFeatureFlagFromEnv('scope_items')
  extractionRegistry.setFeatureFlagFromEnv('success_criteria')
  extractionRegistry.setFeatureFlagFromEnv('phases')
  extractionRegistry.setFeatureFlagFromEnv('project_iterations')
  extractionRegistry.setFeatureFlagFromEnv('best_practices')
  extractionRegistry.setFeatureFlagFromEnv('resources')
  extractionRegistry.setFeatureFlagFromEnv('technologies')
  extractionRegistry.setFeatureFlagFromEnv('quality_standards')
  extractionRegistry.setFeatureFlagFromEnv('team_agreements')
  extractionRegistry.setFeatureFlagFromEnv('development_approaches')
  extractionRegistry.setFeatureFlagFromEnv('governance_decisions')
  extractionRegistry.setFeatureFlagFromEnv('approval_workflows')
  extractionRegistry.setFeatureFlagFromEnv('steering_committees')
  extractionRegistry.setFeatureFlagFromEnv('change_control_boards')
  extractionRegistry.setFeatureFlagFromEnv('policy_compliance')
  extractionRegistry.setFeatureFlagFromEnv('scope_baseline')
  extractionRegistry.setFeatureFlagFromEnv('wbs_nodes')
  extractionRegistry.setFeatureFlagFromEnv('scope_change_requests')
  extractionRegistry.setFeatureFlagFromEnv('requirements_traceability')
  extractionRegistry.setFeatureFlagFromEnv('scope_verification')
  extractionRegistry.setFeatureFlagFromEnv('schedule_baseline')
  extractionRegistry.setFeatureFlagFromEnv('schedule_activities')
  extractionRegistry.setFeatureFlagFromEnv('critical_path')
  extractionRegistry.setFeatureFlagFromEnv('schedule_variances')
  extractionRegistry.setFeatureFlagFromEnv('schedule_forecasts')
  extractionRegistry.setFeatureFlagFromEnv('budget_baseline')
  extractionRegistry.setFeatureFlagFromEnv('cost_estimates')
  extractionRegistry.setFeatureFlagFromEnv('funding_tranches')
  extractionRegistry.setFeatureFlagFromEnv('financial_variances')
  extractionRegistry.setFeatureFlagFromEnv('procurement_costs')
  extractionRegistry.setFeatureFlagFromEnv('resource_plans')
  extractionRegistry.setFeatureFlagFromEnv('roles_and_responsibilities')
  extractionRegistry.setFeatureFlagFromEnv('team_availability')
  extractionRegistry.setFeatureFlagFromEnv('labor_rates')
  extractionRegistry.setFeatureFlagFromEnv('project_org_chart')
  extractionRegistry.setFeatureFlagFromEnv('risk_appetite')
  extractionRegistry.setFeatureFlagFromEnv('risk_checklists')
  extractionRegistry.setFeatureFlagFromEnv('probability_impact_matrix')
  extractionRegistry.setFeatureFlagFromEnv('issue_log')
  extractionRegistry.setFeatureFlagFromEnv('lessons_learned')
  extractionRegistry.setFeatureFlagFromEnv('stakeholder_engagements')
  extractionRegistry.setFeatureFlagFromEnv('communication_logs')
  extractionRegistry.setFeatureFlagFromEnv('action_items')
  extractionRegistry.setFeatureFlagFromEnv('meeting_minutes')
  extractionRegistry.setFeatureFlagFromEnv('project_charter_details')
  extractionRegistry.setFeatureFlagFromEnv('business_case_details')
  extractionRegistry.setFeatureFlagFromEnv('benefit_realization_plan')
  extractionRegistry.setFeatureFlagFromEnv('general_change_requests')
  extractionRegistry.setFeatureFlagFromEnv('project_team_evaluations')
  extractionRegistry.setFeatureFlagFromEnv('dt_assets')

  logger.info('[EXTRACTION-REGISTRY] Registry initialized', {
    registeredEntities: extractionRegistry.getRegisteredEntities(),
    featureFlags: extractionRegistry.getFeatureFlags()
  })
}

