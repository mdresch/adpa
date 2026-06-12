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
  const { extractWorkItems, saveWorkItems } = await Promise.resolve().then(() => require())
  extractionRegistry.register('work_items', {
    extract: extractWorkItems,
    save: saveWorkItems
  })

  // Register capacity_plans module (Phase 4)
  const { extractCapacityPlans, saveCapacityPlans } = await Promise.resolve().then(() => require())
  extractionRegistry.register('capacity_plans', {
    extract: extractCapacityPlans,
    save: saveCapacityPlans
  })

  // Register performance_measurements module (Phase 5)
  const { extractPerformanceMeasurements, savePerformanceMeasurements } = await Promise.resolve().then(() => require())
  extractionRegistry.register('performance_measurements', {
    extract: extractPerformanceMeasurements,
    save: savePerformanceMeasurements
  })

  // Register earned_value_metrics module (Phase 5)
  const { extractEarnedValueMetrics, saveEarnedValueMetrics } = await Promise.resolve().then(() => require())
  extractionRegistry.register('earned_value_metrics', {
    extract: extractEarnedValueMetrics,
    save: saveEarnedValueMetrics
  })

  // Register opportunities module (Phase 5)
  const { extractOpportunities, saveOpportunities } = await Promise.resolve().then(() => require())
  extractionRegistry.register('opportunities', {
    extract: extractOpportunities,
    save: saveOpportunities
  })

  // Register risk_responses module (Phase 5)
  const { extractRiskResponses, saveRiskResponses } = await Promise.resolve().then(() => require())
  extractionRegistry.register('risk_responses', {
    extract: extractRiskResponses,
    save: saveRiskResponses
  })

  // Register performance_actuals module (Phase 5)
  const { extractPerformanceActuals, savePerformanceActuals } = await Promise.resolve().then(() => require())
  extractionRegistry.register('performance_actuals', {
    extract: extractPerformanceActuals,
    save: savePerformanceActuals
  })

  // Register stakeholders module (Phase 6 - Core Entities)
  const { extractStakeholders, saveStakeholders } = await Promise.resolve().then(() => require())
  extractionRegistry.register('stakeholders', {
    extract: extractStakeholders,
    save: saveStakeholders
  })

  // Register requirements module (Phase 6 - Core Entities)
  const { extractRequirements, saveRequirements } = await Promise.resolve().then(() => require())
  extractionRegistry.register('requirements', {
    extract: extractRequirements,
    save: saveRequirements
  })

  // Register risks module (Phase 6 - Core Entities)
  const { extractRisks, saveRisks } = await Promise.resolve().then(() => require())
  extractionRegistry.register('risks', {
    extract: extractRisks,
    save: saveRisks
  })

  // Register milestones module (Phase 6 - Core Entities)
  const { extractMilestones, saveMilestones } = await Promise.resolve().then(() => require())
  extractionRegistry.register('milestones', {
    extract: extractMilestones,
    save: saveMilestones
  })

  // Register constraints module (Phase 6 - Core Entities)
  const { extractConstraints, saveConstraints } = await Promise.resolve().then(() => require())
  extractionRegistry.register('constraints', {
    extract: extractConstraints,
    save: saveConstraints
  })

  // Register activities module (Phase 6 - Core Entities)
  const { extractActivities, saveActivities } = await Promise.resolve().then(() => require())
  extractionRegistry.register('activities', {
    extract: extractActivities,
    save: saveActivities
  })

  // Register deliverables module (Phase 6 - Core Entities)
  const { extractDeliverables, saveDeliverables } = await Promise.resolve().then(() => require())
  extractionRegistry.register('deliverables', {
    extract: extractDeliverables,
    save: saveDeliverables
  })

  // Register scope_items module (Phase 6 - Core Entities)
  const { extractScopeItems, saveScopeItems } = await Promise.resolve().then(() => require())
  extractionRegistry.register('scope_items', {
    extract: extractScopeItems,
    save: saveScopeItems
  })

  // Register success_criteria module (Phase 6 - Core Entities - FINAL)
  const { extractSuccessCriteria, saveSuccessCriteria } = await Promise.resolve().then(() => require())
  extractionRegistry.register('success_criteria', {
    extract: extractSuccessCriteria,
    save: saveSuccessCriteria
  })

  // Register phases module (Phase 7 - Project Phases & Iterations)
  const { extractPhases, savePhases } = await Promise.resolve().then(() => require())
  extractionRegistry.register('phases', {
    extract: extractPhases,
    save: savePhases
  })

  // Register project_iterations module (Phase 7 - Project Phases & Iterations)
  const { extractProjectIterations, saveProjectIterations } = await Promise.resolve().then(() => require())
  extractionRegistry.register('project_iterations', {
    extract: extractProjectIterations,
    save: saveProjectIterations
  })

  // Register best_practices module (Phase 8 - Tier 2 / Quality & Compliance)
  const { extractBestPractices, saveBestPractices } = await Promise.resolve().then(() => require())
  extractionRegistry.register('best_practices', {
    extract: extractBestPractices,
    save: saveBestPractices
  })

  // Register resources module (Phase 8 - Tier 2 / Resource Management)
  const { extractResources, saveResources } = await Promise.resolve().then(() => require())
  extractionRegistry.register('resources', {
    extract: extractResources,
    save: saveResources
  })

  // Register technologies module (Phase 8 - Tier 2 / Knowledge & Technology)
  const { extractTechnologies, saveTechnologies } = await Promise.resolve().then(() => require())
  extractionRegistry.register('technologies', {
    extract: extractTechnologies,
    save: saveTechnologies
  })

  // Register quality_standards module (Phase 8 - Tier 2 / Quality & Compliance)
  const { extractQualityStandards, saveQualityStandards } = await Promise.resolve().then(() => require())
  extractionRegistry.register('quality_standards', {
    extract: extractQualityStandards,
    save: saveQualityStandards
  })

  // Register team_agreements module (Phase 8 - Tier 2 / Team Performance Domain)
  const { extractTeamAgreements, saveTeamAgreements } = await Promise.resolve().then(() => require())
  extractionRegistry.register('team_agreements', {
    extract: extractTeamAgreements,
    save: saveTeamAgreements
  })

  // Register development_approaches module (Phase 8 - Tier 2 / Development Approach & Life Cycle Domain)
  const { extractDevelopmentApproaches, saveDevelopmentApproaches } = await Promise.resolve().then(() => require())
  extractionRegistry.register('development_approaches', {
    extract: extractDevelopmentApproaches,
    save: saveDevelopmentApproaches
  })

  // Register governance_decisions module (Phase 1 - Governance)
  const { extractGovernanceDecisions, saveGovernanceDecisions } = await Promise.resolve().then(() => require())
  extractionRegistry.register('governance_decisions', {
    extract: extractGovernanceDecisions,
    save: saveGovernanceDecisions
  })

  // Register approval_workflows module (Phase 1 - Governance)
  const { extractApprovalWorkflows, saveApprovalWorkflows } = await Promise.resolve().then(() => require())
  extractionRegistry.register('approval_workflows', {
    extract: extractApprovalWorkflows,
    save: saveApprovalWorkflows
  })

  // Register steering_committees module (Phase 1 - Governance)
  const { extractSteeringCommittees, saveSteeringCommittees } = await Promise.resolve().then(() => require())
  extractionRegistry.register('steering_committees', {
    extract: extractSteeringCommittees,
    save: saveSteeringCommittees
  })

  // Register change_control_boards module (Phase 1 - Governance)
  const { extractChangeControlBoards, saveChangeControlBoards } = await Promise.resolve().then(() => require())
  extractionRegistry.register('change_control_boards', {
    extract: extractChangeControlBoards,
    save: saveChangeControlBoards
  })

  // Register policy_compliance module (Phase 1 - Governance)
  const { extractPolicyCompliance, savePolicyCompliance } = await Promise.resolve().then(() => require())
  extractionRegistry.register('policy_compliance', {
    extract: extractPolicyCompliance,
    save: savePolicyCompliance
  })

  // Register scope_baseline module (Phase 1 - Scope)
  const { extractScopeBaseline, saveScopeBaseline } = await Promise.resolve().then(() => require())
  extractionRegistry.register('scope_baseline', {
    extract: extractScopeBaseline,
    save: saveScopeBaseline
  })

  // Register wbs_nodes module (Phase 1 - Scope)
  const { extractWBSNodes, saveWBSNodes } = await Promise.resolve().then(() => require())
  extractionRegistry.register('wbs_nodes', {
    extract: extractWBSNodes,
    save: saveWBSNodes
  })

  // Register scope_change_requests module (Phase 1 - Scope)
  const { extractScopeChangeRequests, saveScopeChangeRequests } = await Promise.resolve().then(() => require())
  extractionRegistry.register('scope_change_requests', {
    extract: extractScopeChangeRequests,
    save: saveScopeChangeRequests
  })

  // Register requirements_traceability module (Phase 1 - Scope)
  const { extractRequirementsTraceability, saveRequirementsTraceability } = await Promise.resolve().then(() => require())
  extractionRegistry.register('requirements_traceability', {
    extract: extractRequirementsTraceability,
    save: saveRequirementsTraceability
  })

  // Register scope_verification module (Phase 1 - Scope)
  const { extractScopeVerification, saveScopeVerification } = await Promise.resolve().then(() => require())
  extractionRegistry.register('scope_verification', {
    extract: extractScopeVerification,
    save: saveScopeVerification
  })

  // Register dt_assets module (Digital Twin - extract from L0 YAML, save to extracted_dt_assets)
  const { extractDtAssets, saveDtAssets } = await Promise.resolve().then(() => require())
  extractionRegistry.register('dt_assets', {
    extract: extractDtAssets,
    save: saveDtAssets
  })

  // Register schedule_baseline module (Phase 2 - Schedule)
  const { extractScheduleBaseline, saveScheduleBaseline } = await Promise.resolve().then(() => require())
  extractionRegistry.register('schedule_baseline', {
    extract: extractScheduleBaseline,
    save: saveScheduleBaseline
  })

  // Register schedule_activities module (Phase 2 - Schedule)
  const { extractScheduleActivities, saveScheduleActivities } = await Promise.resolve().then(() => require())
  extractionRegistry.register('schedule_activities', {
    extract: extractScheduleActivities,
    save: saveScheduleActivities
  })

  // Register critical_path module (Phase 2 - Schedule)
  const { extractCriticalPath, saveCriticalPath } = await Promise.resolve().then(() => require())
  extractionRegistry.register('critical_path', {
    extract: extractCriticalPath,
    save: saveCriticalPath
  })

  // Register schedule_variances module (Phase 2 - Schedule)
  const { extractScheduleVariances, saveScheduleVariances } = await Promise.resolve().then(() => require())
  extractionRegistry.register('schedule_variances', {
    extract: extractScheduleVariances,
    save: saveScheduleVariances
  })

  // Register schedule_forecasts module (Phase 2 - Schedule)
  const { extractScheduleForecasts, saveScheduleForecasts } = await Promise.resolve().then(() => require())
  extractionRegistry.register('schedule_forecasts', {
    extract: extractScheduleForecasts,
    save: saveScheduleForecasts
  })

  // Register budget_baseline module (Phase 2 - Finance)
  const { extractBudgetBaseline, saveBudgetBaseline } = await Promise.resolve().then(() => require())
  extractionRegistry.register('budget_baseline', {
    extract: extractBudgetBaseline,
    save: saveBudgetBaseline
  })

  // Register cost_actuals module (Phase 2 - Finance)
  const { extractCostActuals, saveCostActuals } = await Promise.resolve().then(() => require())
  extractionRegistry.register('cost_actuals', {
    extract: extractCostActuals,
    save: saveCostActuals
  })

  // Register cost_estimates module (Phase 2 - Finance)
  const { extractCostEstimates, saveCostEstimates } = await Promise.resolve().then(() => require())
  extractionRegistry.register('cost_estimates', {
    extract: extractCostEstimates,
    save: saveCostEstimates
  })

  // Register funding_tranches module (Phase 2 - Finance)
  const { extractFundingTranches, saveFundingTranches } = await Promise.resolve().then(() => require())
  extractionRegistry.register('funding_tranches', {
    extract: extractFundingTranches,
    save: saveFundingTranches
  })

  // Register financial_variances module (Phase 2 - Finance)
  const { extractFinancialVariances, saveFinancialVariances } = await Promise.resolve().then(() => require())
  extractionRegistry.register('financial_variances', {
    extract: extractFinancialVariances,
    save: saveFinancialVariances
  })

  // Register procurement_costs module (Phase 2 - Finance)
  const { extractProcurementCosts, saveProcurementCosts } = await Promise.resolve().then(() => require())
  extractionRegistry.register('procurement_costs', {
    extract: extractProcurementCosts,
    save: saveProcurementCosts
  })

  // Register resource_plans module (Phase 3 - Resources)
  const { extractResourcePlans, saveResourcePlans } = await Promise.resolve().then(() => require())
  extractionRegistry.register('resource_plans', {
    extract: extractResourcePlans,
    save: saveResourcePlans
  })

  // Register roles_and_responsibilities module (Phase 3 - Resources)
  const { extractRolesAndResponsibilities, saveRolesAndResponsibilities } = await Promise.resolve().then(() => require())
  extractionRegistry.register('roles_and_responsibilities', {
    extract: extractRolesAndResponsibilities,
    save: saveRolesAndResponsibilities
  })

  // Register team_availability module (Phase 3 - Resources)
  const { extractTeamAvailability, saveTeamAvailability } = await Promise.resolve().then(() => require())
  extractionRegistry.register('team_availability', {
    extract: extractTeamAvailability,
    save: saveTeamAvailability
  })

  // Register labor_rates module (Phase 3 - Resources)
  const { extractLaborRates, saveLaborRates } = await Promise.resolve().then(() => require())
  extractionRegistry.register('labor_rates', {
    extract: extractLaborRates,
    save: saveLaborRates
  })

  // Register project_org_chart module (Phase 3 - Resources)
  const { extractProjectOrgChart, saveProjectOrgChart } = await Promise.resolve().then(() => require())
  extractionRegistry.register('project_org_chart', {
    extract: extractProjectOrgChart,
    save: saveProjectOrgChart
  })

  // Register resource_assignments module (Phase 3 - Resources)
  const { extractResourceAssignments, saveResourceAssignments } = await Promise.resolve().then(() => require())
  extractionRegistry.register('resource_assignments', {
    extract: extractResourceAssignments,
    save: saveResourceAssignments
  })

  // Register resource_pool module (Phase 3 - Resources)
  const { extractResourcePool, saveResourcePool } = await Promise.resolve().then(() => require())
  extractionRegistry.register('resource_pool', {
    extract: extractResourcePool,
    save: saveResourcePool
  })

  // Register capacity_forecasts module (Phase 3 - Resources)
  const { extractCapacityForecasts, saveCapacityForecasts } = await Promise.resolve().then(() => require())
  extractionRegistry.register('capacity_forecasts', {
    extract: extractCapacityForecasts,
    save: saveCapacityForecasts
  })

  // Register utilization_records module (Phase 3 - Resources)
  const { extractUtilizationRecords, saveUtilizationRecords } = await Promise.resolve().then(() => require())
  extractionRegistry.register('utilization_records', {
    extract: extractUtilizationRecords,
    save: saveUtilizationRecords
  })

  // Register resource_conflicts module (Phase 3 - Resources)
  const { extractResourceConflicts, saveResourceConflicts } = await Promise.resolve().then(() => require())
  extractionRegistry.register('resource_conflicts', {
    extract: extractResourceConflicts,
    save: saveResourceConflicts
  })

  // Register onboarding_offboarding module (Phase 3 - Resources)
  const { extractOnboardingOffboarding, saveOnboardingOffboarding } = await Promise.resolve().then(() => require())
  extractionRegistry.register('onboarding_offboarding', {
    extract: extractOnboardingOffboarding,
    save: saveOnboardingOffboarding
  })

  // Register risk_appetite module (Phase 3 - Risk Extensions)
  const { extractRiskAppetite, saveRiskAppetite } = await Promise.resolve().then(() => require())
  extractionRegistry.register('risk_appetite', {
    extract: extractRiskAppetite,
    save: saveRiskAppetite
  })

  // Register risk_checklists module (Phase 3 - Risk Extensions)
  const { extractRiskChecklists, saveRiskChecklists } = await Promise.resolve().then(() => require())
  extractionRegistry.register('risk_checklists', {
    extract: extractRiskChecklists,
    save: saveRiskChecklists
  })

  // Register probability_impact_matrix module (Phase 3 - Risk Extensions)
  const { extractProbabilityImpactMatrix, saveProbabilityImpactMatrix } = await Promise.resolve().then(() => require())
  extractionRegistry.register('probability_impact_matrix', {
    extract: extractProbabilityImpactMatrix,
    save: saveProbabilityImpactMatrix
  })

  // Register risk_assessments module (Phase 3 - Risk Extensions)
  const { extractRiskAssessments, saveRiskAssessments } = await Promise.resolve().then(() => require())
  extractionRegistry.register('risk_assessments', {
    extract: extractRiskAssessments,
    save: saveRiskAssessments
  })

  // Register risk_response_plans module (Phase 3 - Risk Extensions)
  const { extractRiskResponsePlans, saveRiskResponsePlans } = await Promise.resolve().then(() => require())
  extractionRegistry.register('risk_response_plans', {
    extract: extractRiskResponsePlans,
    save: saveRiskResponsePlans
  })

  // Register risk_triggers module (Phase 3 - Risk Extensions)
  const { extractRiskTriggers, saveRiskTriggers } = await Promise.resolve().then(() => require())
  extractionRegistry.register('risk_triggers', {
    extract: extractRiskTriggers,
    save: saveRiskTriggers
  })

  // Register risk_reviews module (Phase 3 - Risk Extensions)
  const { extractRiskReviews, saveRiskReviews } = await Promise.resolve().then(() => require())
  extractionRegistry.register('risk_reviews', {
    extract: extractRiskReviews,
    save: saveRiskReviews
  })

  // Register contingency_reserves module (Phase 3 - Risk Extensions)
  const { extractContingencyReserves, saveContingencyReserves } = await Promise.resolve().then(() => require())
  extractionRegistry.register('contingency_reserves', {
    extract: extractContingencyReserves,
    save: saveContingencyReserves
  })

  // Register risk_metrics module (Phase 3 - Risk Extensions)
  const { extractRiskMetrics, saveRiskMetrics } = await Promise.resolve().then(() => require())
  extractionRegistry.register('risk_metrics', {
    extract: extractRiskMetrics,
    save: saveRiskMetrics
  })

  // Register issue_log module (Phase 3 - Issues)
  const { extractIssueLog, saveIssueLog } = await Promise.resolve().then(() => require())
  extractionRegistry.register('issue_log', {
    extract: extractIssueLog,
    save: saveIssueLog
  })

  // Register lessons_learned module (Phase 3 - Knowledge)
  const { extractLessonsLearned, saveLessonsLearned } = await Promise.resolve().then(() => require())
  extractionRegistry.register('lessons_learned', {
    extract: extractLessonsLearned,
    save: saveLessonsLearned
  })

  // Register stakeholder_engagements module (Phase 4 - Stakeholder Ops)
  const { extractStakeholderEngagements, saveStakeholderEngagements } = await Promise.resolve().then(() => require())
  extractionRegistry.register('stakeholder_engagements', {
    extract: extractStakeholderEngagements,
    save: saveStakeholderEngagements
  })

  // Register communication_logs module (Phase 4 - Stakeholder Ops)
  const { extractCommunicationLogs, saveCommunicationLogs } = await Promise.resolve().then(() => require())
  extractionRegistry.register('communication_logs', {
    extract: extractCommunicationLogs,
    save: saveCommunicationLogs
  })

  // Register engagement_actions module (Phase 4 - Stakeholder Ops)
  const { extractEngagementActions, saveEngagementActions } = await Promise.resolve().then(() => require())
  extractionRegistry.register('engagement_actions', {
    extract: extractEngagementActions,
    save: saveEngagementActions
  })

  // Register satisfaction_surveys module (Phase 4 - Stakeholder Ops)
  const { extractSatisfactionSurveys, saveSatisfactionSurveys } = await Promise.resolve().then(() => require())
  extractionRegistry.register('satisfaction_surveys', {
    extract: extractSatisfactionSurveys,
    save: saveSatisfactionSurveys
  })

  // Register stakeholder_issues module (Phase 4 - Stakeholder Ops)
  const { extractStakeholderIssues, saveStakeholderIssues } = await Promise.resolve().then(() => require())
  extractionRegistry.register('stakeholder_issues', {
    extract: extractStakeholderIssues,
    save: saveStakeholderIssues
  })

  // Register relationship_health module (Phase 4 - Stakeholder Ops)
  const { extractRelationshipHealth, saveRelationshipHealth } = await Promise.resolve().then(() => require())
  extractionRegistry.register('relationship_health', {
    extract: extractRelationshipHealth,
    save: saveRelationshipHealth
  })

  // Register action_items module (Phase 4 - Stakeholder Ops)
  const { extractActionItems, saveActionItems } = await Promise.resolve().then(() => require())
  extractionRegistry.register('action_items', {
    extract: extractActionItems,
    save: saveActionItems
  })

  // Register meeting_minutes module (Phase 4 - Stakeholder Ops)
  const { extractMeetingMinutes, saveMeetingMinutes } = await Promise.resolve().then(() => require())
  extractionRegistry.register('meeting_minutes', {
    extract: extractMeetingMinutes,
    save: saveMeetingMinutes
  })

  // Register project_charter_details module (Phase 4 - Strategy)
  const { extractProjectCharterDetails, saveProjectCharterDetails } = await Promise.resolve().then(() => require())
  extractionRegistry.register('project_charter_details', {
    extract: extractProjectCharterDetails,
    save: saveProjectCharterDetails
  })

  // Register business_case_details module (Phase 4 - Strategy)
  const { extractBusinessCaseDetails, saveBusinessCaseDetails } = await Promise.resolve().then(() => require())
  extractionRegistry.register('business_case_details', {
    extract: extractBusinessCaseDetails,
    save: saveBusinessCaseDetails
  })

  // Register benefit_realization_plan module (Phase 4 - Strategy)
  const { extractBenefitRealizationPlan, saveBenefitRealizationPlan } = await Promise.resolve().then(() => require())
  extractionRegistry.register('benefit_realization_plan', {
    extract: extractBenefitRealizationPlan,
    save: saveBenefitRealizationPlan
  })

  // Register general_change_requests module (Phase 4 - Strategy)
  const { extractGeneralChangeRequests, saveGeneralChangeRequests } = await Promise.resolve().then(() => require())
  extractionRegistry.register('general_change_requests', {
    extract: extractGeneralChangeRequests,
    save: saveGeneralChangeRequests
  })

  // Register project_team_evaluations module (Phase 4 - Strategy)
  const { extractProjectTeamEvaluations, saveProjectTeamEvaluations } = await Promise.resolve().then(() => require())
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
  extractionRegistry.setFeatureFlagFromEnv('cost_actuals')
  extractionRegistry.setFeatureFlagFromEnv('cost_estimates')
  extractionRegistry.setFeatureFlagFromEnv('funding_tranches')
  extractionRegistry.setFeatureFlagFromEnv('financial_variances')
  extractionRegistry.setFeatureFlagFromEnv('procurement_costs')
  extractionRegistry.setFeatureFlagFromEnv('resource_plans')
  extractionRegistry.setFeatureFlagFromEnv('resource_assignments')
  extractionRegistry.setFeatureFlagFromEnv('resource_pool')
  extractionRegistry.setFeatureFlagFromEnv('capacity_forecasts')
  extractionRegistry.setFeatureFlagFromEnv('utilization_records')
  extractionRegistry.setFeatureFlagFromEnv('resource_conflicts')
  extractionRegistry.setFeatureFlagFromEnv('onboarding_offboarding')
  extractionRegistry.setFeatureFlagFromEnv('roles_and_responsibilities')
  extractionRegistry.setFeatureFlagFromEnv('team_availability')
  extractionRegistry.setFeatureFlagFromEnv('labor_rates')
  extractionRegistry.setFeatureFlagFromEnv('project_org_chart')
  extractionRegistry.setFeatureFlagFromEnv('risk_appetite')
  extractionRegistry.setFeatureFlagFromEnv('risk_checklists')
  extractionRegistry.setFeatureFlagFromEnv('probability_impact_matrix')
  extractionRegistry.setFeatureFlagFromEnv('risk_assessments')
  extractionRegistry.setFeatureFlagFromEnv('risk_response_plans')
  extractionRegistry.setFeatureFlagFromEnv('risk_triggers')
  extractionRegistry.setFeatureFlagFromEnv('risk_reviews')
  extractionRegistry.setFeatureFlagFromEnv('contingency_reserves')
  extractionRegistry.setFeatureFlagFromEnv('risk_metrics')
  extractionRegistry.setFeatureFlagFromEnv('issue_log')
  extractionRegistry.setFeatureFlagFromEnv('lessons_learned')
  extractionRegistry.setFeatureFlagFromEnv('stakeholder_engagements')
  extractionRegistry.setFeatureFlagFromEnv('communication_logs')
  extractionRegistry.setFeatureFlagFromEnv('engagement_actions')
  extractionRegistry.setFeatureFlagFromEnv('satisfaction_surveys')
  extractionRegistry.setFeatureFlagFromEnv('stakeholder_issues')
  extractionRegistry.setFeatureFlagFromEnv('relationship_health')
  extractionRegistry.setFeatureFlagFromEnv('action_items')
  extractionRegistry.setFeatureFlagFromEnv('meeting_minutes')
  extractionRegistry.enableFeature('project_charter_details')
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

